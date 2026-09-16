! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ------- GrailClassAttrHolder class definition
expectvalue /Class
doit
Object subclass: 'GrailClassAttrHolder'
  instVarNames: #( dict order )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
GrailClassAttrHolder comment:
'The per-class attribute store a generated Python class keeps in its
``___dynInstVars___'' classInstVar -- the ONE home of every class attribute
(docs/Class_Attribute_Single_Home.md).

It was a plain ``Object new'' whose GemStone dynamic instVars were the class
dict, and every reader still speaks that protocol: dynamicInstVarAt:,
dynamicInstVarAt:put:, dynamicInstVarAt:ifAbsent:, removeDynamicInstVar:,
dynamicInstanceVariables, dynamicInstVarPairs.  A dynamic instVar has a hard
ceiling of 255 per object, and once the body''s own attributes moved into the
holder a class body with more than 255 assignments -- test_listcomps runs one
with 300, in class scope -- hit it as a MemoryError where the classInstVars
it replaced had no limit.  So the holder is now this class, which answers the
same six messages over an unbounded, INSERTION-ORDERED store (the class
__dict__ view depends on the order: test_builtin test_namespace_order), and
no reader had to change.

nil is the unbound token throughout Grail (None is a singleton), so storing
nil REMOVES the entry, exactly as the kernel primitive does.

Instance variables:
* ``dict``  -- IdentityKeyValueDictionary, Symbol -> value.
* ``order`` -- OrderedCollection of the Symbols in first-store order.
'
%

expectvalue /Class
doit
GrailClassAttrHolder category: 'Grail-Modules'
%

! ------------------- Remove existing methods
expectvalue /Metaclass3
doit
GrailClassAttrHolder removeAllMethods.
GrailClassAttrHolder class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Instance Creation'
classmethod: GrailClassAttrHolder
new
	^ super new ___initialize
%

category: 'Grail-Initialization'
method: GrailClassAttrHolder
___initialize
	dict := IdentityKeyValueDictionary new.
	order := OrderedCollection new.
	^ self
%

category: 'Grail-Dynamic InstVar Protocol'
method: GrailClassAttrHolder
dynamicInstVarAt: aSymbol
	"The value stored under aSymbol, or nil."

	^ dict at: aSymbol otherwise: nil
%

category: 'Grail-Dynamic InstVar Protocol'
method: GrailClassAttrHolder
dynamicInstVarAt: aSymbol ifAbsent: aBlock
	^ dict at: aSymbol ifAbsent: aBlock
%

category: 'Grail-Dynamic InstVar Protocol'
method: GrailClassAttrHolder
dynamicInstVarAt: aSymbol put: aValue
	"Store aValue under aSymbol, remembering first-store order; nil removes,
	as the kernel primitive's _remoteNil does.  Answers aValue."

	aValue == nil ifTrue: [
		self removeDynamicInstVar: aSymbol.
		^ aValue].
	(dict includesKey: aSymbol) ifFalse: [order add: aSymbol].
	dict at: aSymbol put: aValue.
	^ aValue
%

category: 'Grail-Dynamic InstVar Protocol'
method: GrailClassAttrHolder
removeDynamicInstVar: aSymbol
	"Remove aSymbol's entry; a missing name is a no-op (every caller probes
	first, and the reset paths sweep names that may already be gone)."

	(dict includesKey: aSymbol) ifFalse: [^ self].
	dict removeKey: aSymbol.
	order remove: aSymbol ifAbsent: [].
	^ self
%

category: 'Grail-Dynamic InstVar Protocol'
method: GrailClassAttrHolder
dynamicInstanceVariables
	"The stored names, as an Array of Symbols in first-store order."

	^ order asArray
%

category: 'Grail-Dynamic InstVar Protocol'
method: GrailClassAttrHolder
dynamicInstVarPairs
	"A flat Array alternating name and value, in first-store order -- the
	shape the kernel answers and ___classDict___ iterates by 2."

	| result |
	result := Array new: order size * 2.
	order doWithIndex: [:sym :i |
		result at: i * 2 - 1 put: sym.
		result at: i * 2 put: (dict at: sym)].
	^ result
%
