package storage

import (
	"context"
	"io"
)

type Storage interface {
	PutObject(ctx context.Context, bucket, key string, reader io.Reader, size int64) error
	GetObject(ctx context.Context, bucket, key string) (io.ReadCloser, error)
	DeleteObject(ctx context.Context, bucket, key string) error
	StatObject(ctx context.Context, bucket, key string) (bool, error)
	EnsureBucket(ctx context.Context, bucket string) error
}
