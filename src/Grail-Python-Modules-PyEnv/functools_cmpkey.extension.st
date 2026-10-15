Extension { #name : 'functools_cmpkey' }

{ #category : 'Grail-Class Attrs' }
functools_cmpkey class >> ___dynInstVars___ [
	"The per-class attribute holder object >> ___classHolderAttrStore___ writes
	into.  ClassDefAst synthesises this pair for every generated Python class;
	a hand-written one needs it spelled out before it can carry a class
	attribute (see functools >> initialize, which binds __hash__ = None)."

	^ ___dynInstVars___

]

{ #category : 'Grail-Class Attrs' }
functools_cmpkey class >> ___dynInstVars___: anObject [
	___dynInstVars___ := anObject

]

{ #category : 'Grail-Comparison' }
functools_cmpkey >> __eq__: other [
	(other isKindOf: functools_cmpkey) ifFalse: [
		TypeError ___signal___: 'other argument must be K instance'].
	^ ((self @env0:dynamicInstVarAt: #cmp) value:
		{ self @env0:dynamicInstVarAt: #obj. other @env0:dynamicInstVarAt: #obj } value: nil)
		@env0:= 0

]

{ #category : 'Grail-Comparison' }
functools_cmpkey >> __ge__: other [
	(other isKindOf: functools_cmpkey) ifFalse: [
		TypeError ___signal___: 'other argument must be K instance'].
	^ ((self @env0:dynamicInstVarAt: #cmp) value:
		{ self @env0:dynamicInstVarAt: #obj. other @env0:dynamicInstVarAt: #obj } value: nil)
		@env0:>= 0

]

{ #category : 'Grail-Comparison' }
functools_cmpkey >> __gt__: other [
	(other isKindOf: functools_cmpkey) ifFalse: [
		TypeError ___signal___: 'other argument must be K instance'].
	^ ((self @env0:dynamicInstVarAt: #cmp) value:
		{ self @env0:dynamicInstVarAt: #obj. other @env0:dynamicInstVarAt: #obj } value: nil)
		@env0:> 0

]

{ #category : 'Grail-Hashing' }
functools_cmpkey >> __hash__ [
	"CPython sets __hash__ = None on the cmp_to_key wrapper, so hash(K(x))
	raises -- the object exists only to carry a comparison, and its equality is
	whatever the user's cmp function says, which no hash could track.

	Grail defined the comparison dunders (__eq__ included) with no __hash__, so
	the wrapper kept object's identity hash and was silently hashable.
	test_functools TestCmpToKeyC/Py.test_hash asserts the raise.

	Written out here rather than picked up by ClassDefAst's
	___unhashableByClassBody___ rule, which only sees classes compiled from a
	Python class BODY; this one is hand-written Smalltalk."

	^ self ___raiseUnhashableType___

]

{ #category : 'Grail-Comparison' }
functools_cmpkey >> __le__: other [
	(other isKindOf: functools_cmpkey) ifFalse: [
		TypeError ___signal___: 'other argument must be K instance'].
	^ ((self @env0:dynamicInstVarAt: #cmp) value:
		{ self @env0:dynamicInstVarAt: #obj. other @env0:dynamicInstVarAt: #obj } value: nil)
		@env0:<= 0

]

{ #category : 'Grail-Comparison' }
functools_cmpkey >> __lt__: other [
	(other isKindOf: functools_cmpkey) ifFalse: [
		TypeError ___signal___: 'other argument must be K instance'].
	^ ((self @env0:dynamicInstVarAt: #cmp) value:
		{ self @env0:dynamicInstVarAt: #obj. other @env0:dynamicInstVarAt: #obj } value: nil)
		@env0:< 0

]
