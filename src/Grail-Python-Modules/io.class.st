"Python io module - in-memory buffers and real file objects.

Provides StringIO and BytesIO with the file-like API Werkzeug WSGI
handling depends on: read / readline / readlines / write / writelines
/ seek / tell / truncate / getvalue / close / __enter__ / __exit__.
Both are iterable - iteration yields lines.

Also provides io.open (same implementation as the open() builtin) and
the FileIO / TextIOWrapper classes it answers, backed by server-side
GsFile.  See the FileIO class comment for the V1 deviations from
CPython (no truncate/fileno, no newline translation)."
Class {
	#name : 'io',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}
