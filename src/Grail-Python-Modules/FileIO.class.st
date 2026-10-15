"Binary file object backing the Python open() builtin.

Wraps a server-side GsFile, always opened with a 'b' fopen mode (on
Unix there is no text/binary distinction at the C level; text decoding
is layered on by the TextIOWrapper subclass).  The GsFile handle and
bookkeeping live in dynamic instVars: _gsfile, _name, _mode, _closed,
_readable, _writable (and _encoding on TextIOWrapper instances).

Known deviations from CPython, kept deliberately small for V1:
  * truncate() is not supported (GsFile has no ftruncate) - raises OSError.
  * fileno() is not supported - raises OSError.
  * No universal-newline translation: \r\n is not folded to \n on read
    and \n is written as-is (matches POSIX platforms for LF files).
  * readline(limit) measures the limit in bytes, not characters."
Class {
	#name : 'FileIO',
	#superclass : 'Object',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Introspection' }
FileIO class >> ___pythonValueAttrs___ [
	^ IdentitySet new
		add: #closed;
		add: #name;
		add: #mode;
		yourself

]
