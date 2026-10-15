Extension { #name : 'BlockingIOError' }

{ #category : 'Grail-Python Attribute Access' }
BlockingIOError >> ___args___: anArray [
	"OSError's unpacking, except that an integer third argument is
	characters_written: OSError is handed the arguments with that slot empty
	(None, which it reads as no filename), and args is then the whole tuple."

	| size copy |
	size := anArray @env0:isNil ifTrue: [0] ifFalse: [anArray @env0:size].
	((size @env0:between: 3 and: 5)
		@env0:and: [(anArray @env0:at: 3) @env0:isKindOf: Integer]) ifFalse: [
			^ super ___args___: anArray].
	copy := anArray @env0:copy.
	copy @env0:at: 3 put: None.
	super ___args___: copy.
	self @env0:dynamicInstVarAt: #'characters_written' put: (anArray @env0:at: 3).
	args := tuple @env0:withAll: anArray

]
