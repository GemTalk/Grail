Extension { #name : 'Exception' }

{ #category : 'Grail-Initialization' }
Exception >> __init__ [
	"Initialize with no arguments."

	self ___args___: #().
	^ None

]

{ #category : 'Grail-Initialization' }
Exception >> __init__: a [
	"Initialize with ONE positional constructor argument ``a'' -- stored as
	the 1-tuple ``(a,)'', matching CPython's ``BaseException.args'' (see
	BaseException>>__init__:)."

	a ifNil: [ self ___args___: #() ] ifNotNil: [ self ___args___: { a } ].
	^ None

]
