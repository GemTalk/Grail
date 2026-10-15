"The Smalltalk superclass of a Python class whose base is a C extension's
own type -- ``class memmap(ndarray)' -- built by ShimForeignObject>>
___subclass___:instVarNames:classInstVarNames:.

A STOPGAP (docs/Shim_Foreign_Subclassing.md, option C).  An instance of such
a class needs a C body in the base's layout, and Grail cannot make one yet,
so the class statement succeeds -- the class can be imported, inspected,
subclassed and named in issubclass -- and calling it refuses with CPython's
``cannot create 'X' instances', before any __new__ can hand C a type it
cannot allocate.  The Python-visible bases name the foreign type, not this
class."
Class {
	#name : 'ShimForeignSubclass',
	#superclass : 'PythonInstance'
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
