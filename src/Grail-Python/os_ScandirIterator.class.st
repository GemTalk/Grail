"What ``os.scandir()' answers -- CPython's posix.ScandirIterator.

An iterator (``__iter__' answers self, ``__next__' advances) that is ALSO a
context manager, because ``with os.scandir(p) as it:' is the spelling CPython's
own library uses and a bare generator could not offer it.  That is the reason
this is a class rather than a PythonGenerator: the iterator protocol alone would
have been a two-line generator, and every ``with' over it would have failed
with an AttributeError on __enter__.

The entries are read EAGERLY, at scandir() time.  CPython's reads the directory
in blocks as you iterate; Grail's cannot, because GsFile answers a whole
directory listing in one call and there is no partial-read primitive under it.
So close() and __exit__ release the held list rather than a directory handle,
and an iterator left unclosed leaks nothing -- which is why no ResourceWarning
is emitted where CPython emits one.

"
Class {
	#name : 'os_ScandirIterator',
	#superclass : 'object',
	#category : 'Grail-Filesystem'
}

{ #category : 'Instance Creation' }
os_ScandirIterator class >> onEntries: anOrderedCollection [
	| inst |
	inst := self new.
	inst dynamicInstVarAt: #'___entries___' put: anOrderedCollection.
	inst dynamicInstVarAt: #'___index___' put: 1.
	^ inst

]
