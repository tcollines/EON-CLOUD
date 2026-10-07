package com.example.eon.provider

import android.database.Cursor
import android.database.MatrixCursor
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.provider.DocumentsContract
import android.provider.DocumentsProvider
import java.io.FileNotFoundException

class EonDocumentsProvider : DocumentsProvider() {

    override fun onCreate(): Boolean {
        // Initialize connections to the repository or database here if necessary.
        return true
    }

    override fun queryRoots(projection: Array<String>?): Cursor {
        val flags = DocumentsContract.Root.FLAG_SUPPORTS_CREATE or
                    DocumentsContract.Root.FLAG_SUPPORTS_IS_CHILD
                    
        val result = MatrixCursor(projection ?: arrayOf(
            DocumentsContract.Root.COLUMN_ROOT_ID,
            DocumentsContract.Root.COLUMN_DOCUMENT_ID,
            DocumentsContract.Root.COLUMN_TITLE,
            DocumentsContract.Root.COLUMN_FLAGS,
            DocumentsContract.Root.COLUMN_ICON
        ))

        result.newRow().apply {
            add(DocumentsContract.Root.COLUMN_ROOT_ID, "eon_root")
            add(DocumentsContract.Root.COLUMN_DOCUMENT_ID, "root_doc")
            add(DocumentsContract.Root.COLUMN_TITLE, "Eon Cloud Workspace")
            add(DocumentsContract.Root.COLUMN_FLAGS, flags)
            // add(DocumentsContract.Root.COLUMN_ICON, R.mipmap.ic_launcher)
        }

        return result
    }

    override fun queryDocument(documentId: String, projection: Array<String>?): Cursor {
        val result = MatrixCursor(projection ?: arrayOf(
            DocumentsContract.Document.COLUMN_DOCUMENT_ID,
            DocumentsContract.Document.COLUMN_MIME_TYPE,
            DocumentsContract.Document.COLUMN_DISPLAY_NAME,
            DocumentsContract.Document.COLUMN_LAST_MODIFIED,
            DocumentsContract.Document.COLUMN_FLAGS,
            DocumentsContract.Document.COLUMN_SIZE
        ))
        
        if (documentId == "root_doc") {
            result.newRow().apply {
                add(DocumentsContract.Document.COLUMN_DOCUMENT_ID, "root_doc")
                add(DocumentsContract.Document.COLUMN_MIME_TYPE, DocumentsContract.Document.MIME_TYPE_DIR)
                add(DocumentsContract.Document.COLUMN_DISPLAY_NAME, "Eon Cloud Workspace")
                add(DocumentsContract.Document.COLUMN_FLAGS, DocumentsContract.Document.FLAG_DIR_SUPPORTS_CREATE)
            }
        }
        return result
    }

    override fun queryChildDocuments(
        parentDocumentId: String,
        projection: Array<String>?,
        sortOrder: String?
    ): Cursor {
        val result = MatrixCursor(projection ?: arrayOf(
            DocumentsContract.Document.COLUMN_DOCUMENT_ID,
            DocumentsContract.Document.COLUMN_MIME_TYPE,
            DocumentsContract.Document.COLUMN_DISPLAY_NAME
        ))

        if (parentDocumentId == "root_doc") {
            // Mocking a folder inside the root
            result.newRow().apply {
                add(DocumentsContract.Document.COLUMN_DOCUMENT_ID, "mock_project_folder")
                add(DocumentsContract.Document.COLUMN_MIME_TYPE, DocumentsContract.Document.MIME_TYPE_DIR)
                add(DocumentsContract.Document.COLUMN_DISPLAY_NAME, "Projects")
            }
            // Mocking a file
            result.newRow().apply {
                add(DocumentsContract.Document.COLUMN_DOCUMENT_ID, "mock_file_1")
                add(DocumentsContract.Document.COLUMN_MIME_TYPE, "text/plain")
                add(DocumentsContract.Document.COLUMN_DISPLAY_NAME, "notes.txt")
            }
        }
        return result
    }

    override fun openDocument(
        documentId: String,
        mode: String,
        signal: CancellationSignal?
    ): ParcelFileDescriptor {
        throw FileNotFoundException("Opening files is not yet implemented.")
    }
}
