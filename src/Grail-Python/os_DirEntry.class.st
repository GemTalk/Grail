"One entry from ``os.scandir()' -- CPython's DirEntry.

Carries the entry's ``name' and full ``path' and answers the type questions
about it: is_dir / is_file / is_symlink / stat / inode, each with the
follow_symlinks argument where CPython has one.

WHAT IT DOES NOT DO IS CACHE.  CPython's DirEntry caches the stat results it
has been asked for, which is what makes scandir faster than listdir + stat,
and its documentation warns that a cached answer may already be stale.  This
one re-stats on every question, so it is SLOWER and FRESHER than CPython's.
Code that reads an entry twice across a filesystem change therefore sees the
change here and might not there -- a difference in CPython's favour for speed
and in this one's for accuracy, and in neither's for conformance.

is_junction is always false: junctions are a Windows concept, and Grail's os
reports ``posix'.

"
Class {
	#name : 'os_DirEntry',
	#superclass : 'object',
	#category : 'Grail-Filesystem'
}

{ #category : 'Grail-Python Attribute Hook' }
os_DirEntry class >> ___pythonValueAttrs___ [
	"name and path are DATA; everything else about an entry is a method call,
	exactly as in CPython (``e.name'' but ``e.is_dir()'')."

	^ IdentitySet new add: #'name'; add: #'path'; yourself

]

{ #category : 'Instance Creation' }
os_DirEntry class >> name: aName path: aPath [
	"Fields are dynamic instVars named exactly as the Python attributes, so
	``entry.name'' reads the VALUE rather than a BoundMethod wrapping an
	accessor -- the same arrangement PyStatResult uses for its st_* fields."

	| inst |
	inst := self new.
	inst dynamicInstVarAt: #'name' put: aName.
	inst dynamicInstVarAt: #'path' put: aPath.
	^ inst

]
