Extension { #name : 'os_ScandirIterator' }

{ #category : 'Grail-Filesystem' }
os_ScandirIterator >> __enter__ [
	"``with os.scandir(p) as it:'' -- the spelling CPython's own library uses,
	and the reason this is a class rather than a generator."

	^ self

]

{ #category : 'Grail-Filesystem' }
os_ScandirIterator >> __exit__: excType _: excValue _: excTb [
	"Answer false so an exception inside the ``with'' still propagates."

	self close.
	^ false

]

{ #category : 'Grail-Filesystem' }
os_ScandirIterator >> __iter__ [
	"Its own iterator, as every CPython iterator is."

	^ self

]

{ #category : 'Grail-Filesystem' }
os_ScandirIterator >> __next__ [
	"Exhaustion LATCHES: close() empties the list and the index runs past the
	end, so a spent iterator stays spent."

	| entries index |
	entries := self @env0:dynamicInstVarAt: #'___entries___'.
	index := self @env0:dynamicInstVarAt: #'___index___'.
	(entries @env0:isNil @env0:or: [index @env0:> entries @env0:size])
		ifTrue: [StopIteration @env0:signal].
	self @env0:dynamicInstVarAt: #'___index___' put: index @env0:+ 1.
	^ entries @env0:at: index

]

{ #category : 'Grail-Filesystem' }
os_ScandirIterator >> close [
	"Release the entries.  CPython closes a live directory handle here;
	Grail's listing is already complete by construction (see the class
	comment), so this only drops the reference -- calling it twice, or never,
	is harmless either way."

	self @env0:dynamicInstVarAt: #'___entries___' put: nil.
	^ None

]
