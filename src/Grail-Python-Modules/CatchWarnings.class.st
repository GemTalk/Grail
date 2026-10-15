Class {
	#name : 'CatchWarnings',
	#superclass : 'Object',
	#instVars : [
		'_owner',
		'_savedFilters',
		'_savedSeen',
		'_record',
		'_savedShowwarning',
		'_hadShowwarning',
		'_filterSpec',
		'_entered',
		'_coroutineMark'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Private' }
CatchWarnings >> _filterSpec: anArrayOrNil [
	"CPython 3.11's shorthand: catch_warnings(action=..., category=...,
	lineno=..., append=...) installs that filter on entry, inside the
	isolation it was already providing.  nil means no filter was asked for,
	which is NOT the same as an empty one."

	_filterSpec := anArrayOrNil.
	^ self

]

{ #category : 'Grail-Private' }
CatchWarnings >> _owner: aWarnings [
	_owner := aWarnings.
	^ self

]

{ #category : 'Grail-Private' }
CatchWarnings >> _record: aBoolean [
	_record := aBoolean == true.
	^ self

]
