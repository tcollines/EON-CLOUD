package storage

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
)

const ChunkSize = 4 * 1024 * 1024 // 4MB chunks

// EonVFSEngine manages chunking and assembling files over an underlying Storage interface.
// This brings the concepts of JuiceFS natively into Eon Cloud.
type EonVFSEngine struct {
	store       Storage
	chunkBucket string
}

// NewEonVFSEngine creates a new chunking engine.
func NewEonVFSEngine(store Storage, chunkBucket string) *EonVFSEngine {
	return &EonVFSEngine{
		store:       store,
		chunkBucket: chunkBucket,
	}
}

// EnsureInit makes sure the underlying bucket for chunks exists.
func (e *EonVFSEngine) EnsureInit(ctx context.Context) error {
	return e.store.EnsureBucket(ctx, e.chunkBucket)
}

// SaveStream reads from reader, chunks the data (4MB), hashes each chunk (SHA-256),
// stores it in object storage if it doesn't already exist (deduplication),
// and returns the list of chunk hashes (metadata) and total file size.
func (e *EonVFSEngine) SaveStream(ctx context.Context, reader io.Reader) ([]string, int64, error) {
	var chunkHashes []string
	var totalSize int64

	buf := make([]byte, ChunkSize)
	for {
		n, err := io.ReadFull(reader, buf)
		if n > 0 {
			chunkData := buf[:n]
			totalSize += int64(n)

			// Calculate SHA-256 hash for content-addressable storage
			hash := sha256.Sum256(chunkData)
			chunkID := hex.EncodeToString(hash[:])

			// Check if chunk exists (Deduplication!)
			exists, statErr := e.store.StatObject(ctx, e.chunkBucket, chunkID)
			if statErr != nil {
				return nil, 0, fmt.Errorf("failed to stat chunk %s: %w", chunkID, statErr)
			}

			if !exists {
				// Upload chunk
				errPut := e.store.PutObject(ctx, e.chunkBucket, chunkID, bytes.NewReader(chunkData), int64(n))
				if errPut != nil {
					return nil, 0, fmt.Errorf("failed to upload chunk %s: %w", chunkID, errPut)
				}
			}

			chunkHashes = append(chunkHashes, chunkID)
		}

		if err == io.EOF || err == io.ErrUnexpectedEOF {
			break
		}
		if err != nil {
			return nil, 0, err
		}
	}

	return chunkHashes, totalSize, nil
}

// ReadStream takes a list of chunk hashes and returns an io.ReadCloser that transparently reconstructs the file.
func (e *EonVFSEngine) ReadStream(ctx context.Context, chunkHashes []string) (io.ReadCloser, error) {
	return &chunkReader{
		ctx:         ctx,
		engine:      e,
		chunkHashes: chunkHashes,
		chunkIndex:  0,
	}, nil
}

// chunkReader implements io.ReadCloser to seamlessly read across multiple underlying chunks.
type chunkReader struct {
	ctx           context.Context
	engine        *EonVFSEngine
	chunkHashes   []string
	chunkIndex    int
	currentReader io.ReadCloser
}

func (cr *chunkReader) Read(p []byte) (n int, err error) {
	for {
		// If we don't have an active reader, open the next chunk
		if cr.currentReader == nil {
			if cr.chunkIndex >= len(cr.chunkHashes) {
				return 0, io.EOF
			}

			chunkID := cr.chunkHashes[cr.chunkIndex]
			cr.chunkIndex++

			r, err := cr.engine.store.GetObject(cr.ctx, cr.engine.chunkBucket, chunkID)
			if err != nil {
				return 0, fmt.Errorf("failed to get chunk %s: %w", chunkID, err)
			}
			cr.currentReader = r
		}

		n, err = cr.currentReader.Read(p)
		if n > 0 {
			return n, nil // We read some data, return it
		}

		if err == io.EOF {
			// Finished this chunk, close it and loop to get the next one
			cr.currentReader.Close()
			cr.currentReader = nil
			continue
		}

		if err != nil {
			return 0, err // Some other error occurred
		}
	}
}

func (cr *chunkReader) Close() error {
	if cr.currentReader != nil {
		return cr.currentReader.Close()
	}
	return nil
}
