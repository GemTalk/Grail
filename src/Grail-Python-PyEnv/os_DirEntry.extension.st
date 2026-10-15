Extension { #name : 'os_DirEntry' }

{ #category : 'Grail-Filesystem' }
os_DirEntry >> __fspath__ [
	"DirEntry is path-like (PEP 519), so it can be passed straight to open()
	or any os function -- which is most of the point of scandir."

	^ self path

]

{ #category : 'Grail-Filesystem' }
os_DirEntry >> __repr__ [
	"CPython renders <DirEntry 'name'> -- the NAME, not the path."

	^ '<DirEntry ' @env0:, ((((Python @env0:at: #builtins) instance) repr: self name) @env0:asString) @env0:, '>'

]

{ #category : 'Grail-Filesystem' }
os_DirEntry >> _is_dir: positional kw: kwargs [
	"entry.is_dir(follow_symlinks=False) -- with following off, a symlink is
	never a directory, whatever it points at."

	| follow |
	follow := (os instance) ___scandirFollowArg___: positional kw: kwargs
		for: 'is_dir'.
	follow ifTrue: [^ self is_dir].
	((os instance) ___isLink___: self path) ifTrue: [^ false].
	^ (os instance) isdir: self path

]

{ #category : 'Grail-Filesystem' }
os_DirEntry >> _is_file: positional kw: kwargs [
	"entry.is_file(follow_symlinks=False).  A symlink is not a regular file
	when following is off, even one pointing at a regular file."

	| follow |
	follow := (os instance) ___scandirFollowArg___: positional kw: kwargs
		for: 'is_file'.
	follow ifTrue: [^ self is_file].
	((os instance) ___isLink___: self path) ifTrue: [^ false].
	^ (os instance) isfile: self path

]

{ #category : 'Grail-Filesystem' }
os_DirEntry >> _stat: positional kw: kwargs [
	"entry.stat(follow_symlinks=False) -- lstat, so a symlink reports itself."

	| follow |
	follow := (os instance) ___scandirFollowArg___: positional kw: kwargs
		for: 'stat'.
	follow ifTrue: [^ self stat].
	^ (os instance) lstat: self path

]

{ #category : 'Grail-Filesystem' }
os_DirEntry >> inode [
	"entry.inode() -- the inode number, from lstat: CPython's does not follow
	the link either, so a symlink answers ITS inode, not its target's."

	^ ((os instance) lstat: self path) @env1:___pyAttrLoad___: #'st_ino'

]

{ #category : 'Grail-Filesystem' }
os_DirEntry >> is_dir [
	"entry.is_dir() -- follow_symlinks defaults to TRUE, so a symlink to a
	directory answers true."

	^ (os instance) isdir: self path

]

{ #category : 'Grail-Filesystem' }
os_DirEntry >> is_file [
	"entry.is_file() -- follow_symlinks defaults to true."

	^ (os instance) isfile: self path

]

{ #category : 'Grail-Filesystem' }
os_DirEntry >> is_junction [
	"Junctions are a Windows concept; Grail's os reports ``posix''."

	^ false

]

{ #category : 'Grail-Filesystem' }
os_DirEntry >> is_symlink [
	"entry.is_symlink() -- no follow_symlinks argument in CPython either;
	asking whether something IS a link cannot follow it."

	^ (os instance) ___isLink___: self path

]

{ #category : 'Grail-Filesystem' }
os_DirEntry >> name [
	^ self @env0:dynamicInstVarAt: #'name'

]

{ #category : 'Grail-Filesystem' }
os_DirEntry >> path [
	^ self @env0:dynamicInstVarAt: #'path'

]

{ #category : 'Grail-Filesystem' }
os_DirEntry >> stat [
	"entry.stat() -- follow_symlinks defaults to true, so a symlink reports
	its TARGET's stat."

	^ (os instance) stat: self path

]
