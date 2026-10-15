"The Smalltalk superclass of a Python class whose base is a C extension's
own type -- ``class memmap(ndarray)' -- built by ShimForeignObject>>
___subclass___:instVarNames:classInstVarNames:.

An instance is two halves (docs/Shim_Foreign_Subclassing.md, option A, and
its section 8): a C body in the base's layout, allocated through the
class's subtype mirror (CPythonShim>>___buildSubtypeMirrorFor:), and an
instance of the Python class -- this one's subclass -- which holds the body
in grailForeignBody.  A name the Python classes do not define is the C
base's, read through the body.  The Python-visible bases name the foreign
type, not this class."
Class {
	#name : 'ShimForeignSubclass',
	#superclass : 'PythonInstance',
	#instVars : [
		'grailForeignBody',
		'grailBodyProxy'
	]
}

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass class >> ___foreignBaseOf: aClass [
	"The proxy of the C type aClass descends from, or nil -- aClass itself is
	recorded when built directly on it, a subclass of that class is not."

	| c map |
	map := SessionTemps current at: #'GrailForeignSubclassBases' otherwise: nil.
	map isNil ifTrue: [^ nil].
	c := aClass.
	[c notNil and: [c ~~ ShimForeignSubclass]] whileTrue: [ | p |
		p := map at: c otherwise: nil.
		p notNil ifTrue: [^ p].
		c := c superclass].
	^ nil

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass class >> ___foreignBases [
	"Each class built directly on a foreign type, to the type's proxy.
	Session state: the proxy's pointer dies with the gem."

	^ SessionTemps current
		at: #'GrailForeignSubclassBases'
		ifAbsentPut: [ IdentityKeyValueDictionary new ]

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass class >> ___grailForeignBaseProxy___ [
	"The proxy of the C type this class descends from (see ___foreignBaseOf:)."

	^ ShimForeignSubclass ___foreignBaseOf: self

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass class >> ___grailNoFallbackFor: anObject name: aSym [
	"Is the fall back to the C base turned off for this read, because C is
	asking and reads the base's part itself (CPythonShim>>
	foreignSubclassGetAttr:name:)?"

	| key |
	key := SessionTemps current at: #'GrailForeignNoFallback' otherwise: nil.
	^ key notNil and: [key key == anObject and: [key value == aSym]]

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> ___grailBodyProxy___ [
	"A ShimForeignObject over the body: what the base type does -- its
	attributes, operators and C protocol -- is asked of it.  Its pointer is the
	body's, so whatever it hands C is the body again, and whatever C answers
	that is a body of a subclass instance comes back as its Grail half."

	grailBodyProxy isNil ifTrue: [
		grailBodyProxy := ShimForeignObject new
			setCPtr: grailForeignBody memoryAddress
			typeName: self class name asString].
	^ grailBodyProxy

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> ___grailForeignBody___ [
	"The C body of this instance: a gcMalloc'd block in the foreign base's
	layout whose ob_type is the class's subtype mirror and whose last word is
	this object's OOP (CPythonShim>>PyType_AllocForeignSubclass:type:basicSize:).
	nil for an instance no allocator made."

	^ grailForeignBody

]

{ #category : 'Grail-Foreign Subclassing' }
ShimForeignSubclass >> ___grailForeignBody___: aCByteArray [
	grailForeignBody := aCByteArray

]
