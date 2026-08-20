! ===============================================================================
! dict view objects: dict_keys / dict_values / dict_items
! ===============================================================================
! Python 3 ``d.keys()`` / ``d.values()`` / ``d.items()`` return live VIEW
! objects, not lists: they iterate the current dict, repr as
! ``dict_keys([...])``, and (keys/items) support the set operations
! (& | - ^ and the <=/</>=/> subset comparisons) because their elements are
! unique.  values views are not set-like.
!
! Each view keeps a reference to the backing dict (``mapping'') and materialises
! its elements via ___elements (an env-0 subclass hook).  A Smalltalk-collection
! protocol (do:/size/includes:/at:/first/isEmpty/asArray) is provided in env 0
! too, so any Smalltalk caller that held the old list-returning behaviour of
! keys/values/items keeps working.
! ===============================================================================

run
dict ifNil: [self error: 'dict is not defined. Check file ordering.'].
%

expectvalue /Class
doit
object subclass: 'dict_view'
  instVarNames: #( mapping )
  classVars: #() classInstVars: #() poolDictionaries: #()
  inDictionary: Python options: #()
%
expectvalue /Class
doit
dict_view category: 'Grail-Collections'
%
expectvalue /Class
doit
dict_view subclass: 'dict_set_view'
  instVarNames: #() classVars: #() classInstVars: #() poolDictionaries: #()
  inDictionary: Python options: #()
%
expectvalue /Class
doit
dict_set_view category: 'Grail-Collections'
%
expectvalue /Class
doit
dict_set_view subclass: 'dict_keys'
  instVarNames: #() classVars: #() classInstVars: #() poolDictionaries: #()
  inDictionary: Python options: #()
%
expectvalue /Class
doit
dict_keys category: 'Grail-Collections'
%
expectvalue /Class
doit
dict_set_view subclass: 'dict_items'
  instVarNames: #() classVars: #() classInstVars: #() poolDictionaries: #()
  inDictionary: Python options: #()
%
expectvalue /Class
doit
dict_items category: 'Grail-Collections'
%
expectvalue /Class
doit
dict_view subclass: 'dict_values'
  instVarNames: #() classVars: #() classInstVars: #() poolDictionaries: #()
  inDictionary: Python options: #()
%
expectvalue /Class
doit
dict_values category: 'Grail-Collections'
%

expectvalue /Metaclass3
doit
dict_view removeAllMethods: 1. dict_view class removeAllMethods: 1.
dict_set_view removeAllMethods: 1. dict_set_view class removeAllMethods: 1.
dict_keys removeAllMethods: 1. dict_keys class removeAllMethods: 1.
dict_items removeAllMethods: 1. dict_items class removeAllMethods: 1.
dict_values removeAllMethods: 1. dict_values class removeAllMethods: 1.
%

set compile_env: 1

! ------------------- construction (env-1: called from dict>>keys etc.)
category: 'Grail-Initialization'
classmethod: dict_view
___on: aDict
	| v |
	v := self ___new___.
	v ___setMapping: aDict.
	^ v
%

category: 'Grail-Callable'
classmethod: dict_view
value: positional value: kwargs
	"dict views are NOT constructible from Python: CPython's tp_new is NULL, so
	``type({}.keys())(...)'' (and the 0-arg form) raises TypeError.  This is the
	class-call entry for both direct ``Cls(...)'' and the indirect
	value:value: path; the internal ``___on:'' constructor bypasses it
	(test_dictviews test_constructors_not_callable)."

	^ TypeError ___signal___:
		'cannot create ''' @env0:, self @env0:name @env0:asString @env0:, ''' instances'
%

category: 'Grail-Private'
method: dict_view
___setMapping: aDict
	mapping := aDict
%

category: 'Grail-Accessors'
method: dict_view
mapping
	"CPython dict-view ``.mapping'' (3.10+): a read-only mappingproxy over
	the LIVE backing dict, not the dict itself (test_dict
	test_views_mapping)."
	^ mappingproxy ___on: mapping
%

! ------------------- Python protocol (env-1)
category: 'Grail-Copy Protocol'
method: dict_view
__copy__
	"dict views are not copyable -- CPython's copy.copy(d.keys()) raises
	TypeError (its default __reduce_ex__ refuses to pickle the view).  Grail's
	copy stub honors __copy__ first, so raising here is what makes copy.copy
	(and deepcopy, below) reject a view (test_dictviews test_copy)."

	^ TypeError ___signal___:
		'cannot copy ''' @env0:, self @env0:class @env0:name @env0:asString @env0:, ''' object'
%

category: 'Grail-Copy Protocol'
method: dict_view
__deepcopy__: memo
	"See __copy__: a view is not deep-copyable either."

	^ TypeError ___signal___:
		'cannot copy ''' @env0:, self @env0:class @env0:name @env0:asString @env0:, ''' object'
%

category: 'Grail-Collection Protocol'
method: dict_view
__len__
	^ mapping @env0:size
%

category: 'Grail-Iterator Protocol'
method: dict_view
__iter__
	^ (self @env0:___elements) __iter__
%

category: 'Grail-Iterator Protocol'
method: dict_view
__reversed__
	^ (self @env0:___elements) __reversed__
%

! ------------------- set-like view (keys / items): & | - ^ and comparisons
category: 'Grail-Set Operations (Operators)'
method: dict_set_view
__and__: other
	^ (set @env1:__new__: self) intersection: other
%

category: 'Grail-Set Operations (Operators)'
method: dict_set_view
__rand__: other
	^ (set @env1:__new__: self) intersection: other
%

category: 'Grail-Set Operations (Operators)'
method: dict_set_view
__or__: other
	^ (set @env1:__new__: self) union: other
%

category: 'Grail-Set Operations (Operators)'
method: dict_set_view
__ror__: other
	^ (set @env1:__new__: other) union: self
%

category: 'Grail-Set Operations (Operators)'
method: dict_set_view
__sub__: other
	^ (set @env1:__new__: self) difference: other
%

category: 'Grail-Set Operations (Operators)'
method: dict_set_view
__rsub__: other
	^ (set @env1:__new__: other) difference: self
%

category: 'Grail-Set Operations (Operators)'
method: dict_set_view
__xor__: other
	^ (set @env1:__new__: self) symmetric_difference: other
%

category: 'Grail-Set Operations (Operators)'
method: dict_set_view
__rxor__: other
	^ (set @env1:__new__: self) symmetric_difference: other
%

! Set-like comparison uses CPython's dictview_richcompare: a size test plus a
! containment walk (``all item of A are in B'') driven by the view's Python
! __contains__.  NOT a set-of-(key,value)-pairs comparison -- a dict_items
! __contains__ compares the VALUE with __eq__, so a raising value __eq__
! propagates (test_dict test_errors_in_view_containment_check) and unhashable
! values (which a pair-set would choke on) are handled.

category: 'Grail-Comparison'
method: dict_set_view
___cmpElements___: other
	"other's elements as a Smalltalk collection (another view's ___elements, or
	any set-like materialized via list())."

	(other isKindOf: dict_view) ifTrue: [^ other @env0:___elements].
	^ (list @env1:__new__: other) @env0:asArray
%

category: 'Grail-Comparison'
method: dict_set_view
___each___: elemColl containedIn: container
	"True iff every element of elemColl tests `in` container via Python
	__contains__ (whose value __eq__, for dict_items, may raise -- let it)."

	elemColl @env0:do: [:item |
		(container @env1:__contains__: item) @env1:___isTruthy___ ifFalse: [^ false]].
	^ true
%

category: 'Grail-Comparison'
method: dict_set_view
__eq__: other
	((other isKindOf: Set) @env0:or: [other isKindOf: dict_set_view])
		ifFalse: [^ false].
	(self @env0:size @env0:= (other @env0:size)) ifFalse: [^ false].
	^ self ___each___: (self @env0:___elements) containedIn: other
%

category: 'Grail-Comparison'
method: dict_set_view
__ne__: other
	^ (self __eq__: other) @env0:not
%

category: 'Grail-Hashing'
method: dict_set_view
__hash__
	"CPython sets __hash__ = None on the SET-LIKE views, so hash(d.keys()) and
	hash(d.items()) raise.  They are unhashable for the ordinary reason: they
	define a set-like __eq__ over contents that change with the dict, so no
	stable hash exists.

	Placed on dict_set_view, which is exactly dict_keys + dict_items.
	dict_values descends from dict_view instead and is deliberately NOT
	covered: it has no set-like __eq__, so CPython leaves it with object's
	identity hash and ``hash(d.values())'' SUCCEEDS.  Grail already inherits
	that, so following CPython here means changing only the two set-like
	views -- the class hierarchy happens to draw the line in the same place.

	Names the receiver's own class, so dict_keys and dict_items each report
	themselves as CPython does."

	TypeError ___signal___: 'unhashable type: ''' @env0:,
		(self @env0:class @env0:name @env0:asString) @env0:, ''''
%

category: 'Grail-Comparison'
method: dict_set_view
__le__: other
	(self @env0:size @env0:> (other @env0:size)) ifTrue: [^ false].
	^ self ___each___: (self @env0:___elements) containedIn: other
%

category: 'Grail-Comparison'
method: dict_set_view
__lt__: other
	(self @env0:size @env0:< (other @env0:size)) ifFalse: [^ false].
	^ self ___each___: (self @env0:___elements) containedIn: other
%

category: 'Grail-Comparison'
method: dict_set_view
__ge__: other
	(self @env0:size @env0:< (other @env0:size)) ifTrue: [^ false].
	^ self ___each___: (self ___cmpElements___: other) containedIn: self
%

category: 'Grail-Comparison'
method: dict_set_view
__gt__: other
	(self @env0:size @env0:> (other @env0:size)) ifFalse: [^ false].
	^ self ___each___: (self ___cmpElements___: other) containedIn: self
%

category: 'Grail-Set Tests'
method: dict_set_view
isdisjoint: other
	^ (set @env1:__new__: self) isdisjoint: other
%

! ------------------- per-view Python membership + repr (env-1)

category: 'Grail-String Representation'
method: dict_view
___reprElementsPrefixed: aPrefix
	"``<prefix>[elem, ...])'' with CPython's reentrant-repr guard: a view held
	(directly or transitively) inside its own backing dict -- ``d[42] =
	d.values()'' -- would otherwise recurse forever.  On re-entry for the SAME
	view, answer ``...'' (CPython's dictview_repr uses Py_ReprEnter, so the
	enclosing list repr renders ``[...]''); a genuinely deep, non-cyclic nest
	still raises the catchable RecursionError.  Shares the session-local
	#GrailReprSeen set with list/dict/tuple repr (test_dictviews
	test_recursive_repr / test_deeply_nested_repr)."

	| seen |
	seen := SessionTemps @env0:current @env0:at: #GrailReprSeen otherwise: nil.
	seen @env0:isNil ifTrue: [
		seen := IdentitySet @env0:new.
		SessionTemps @env0:current @env0:at: #GrailReprSeen put: seen].
	(seen @env0:includes: self) ifTrue: [^ '...'].
	seen @env0:size @env0:> 200 ifTrue: [
		RecursionError ___signal___: 'maximum recursion depth exceeded while getting the repr of an object'].
	seen @env0:add: self.
	^ [[ aPrefix @env0:, (self @env0:___elements) __repr__ @env0:, ')' ]
		@env0:on: (AlmostOutOfStack @env0:, AlmostOutOfStackError) do: [:ex |
			RecursionError ___signal___: 'maximum recursion depth exceeded while getting the repr of an object']]
		@env0:ensure: [seen @env0:remove: self otherwise: nil]
%

category: 'Grail-Collection Protocol'
method: dict_keys
__contains__: k
	^ mapping @env0:includesKey: k
%

category: 'Grail-String Representation'
method: dict_keys
__repr__
	^ self ___reprElementsPrefixed: 'dict_keys('
%

category: 'Grail-Iterator Protocol'
method: dict_keys
__iter__
	"Return the LIVE key iterator over the backing dict (not a snapshot-list
	iterator) so a structural mutation during iteration is detected
	(test_mutating_iteration_delete_over_*)."
	^ dict_keyiterator ___on: mapping
%

category: 'Grail-Collection Protocol'
method: dict_items
__contains__: pair
	| k v |
	(pair isKindOf: SequenceableCollection) ifFalse: [^ false].
	(pair @env0:size @env0:= 2) ifFalse: [^ false].
	k := pair @env0:at: 1.
	v := pair @env0:at: 2.
	(mapping @env0:includesKey: k) ifFalse: [^ false].
	"Identity-first value comparison (CPython PyObject_RichCompareBool): a
	pair whose value IS the stored value tests ``in'' without calling __eq__,
	so a raising/side-effecting __eq__ is skipped when they are identical
	(test_dictviews test_compare_error)."
	^ (mapping @env0:at: k) ___pyRichEqBool___: v
%

category: 'Grail-String Representation'
method: dict_items
__repr__
	^ self ___reprElementsPrefixed: 'dict_items('
%

category: 'Grail-Iterator Protocol'
method: dict_items
__iter__
	"Live item iterator (see dict_keys>>__iter__)."
	^ dict_itemiterator ___on: mapping
%

category: 'Grail-Collection Protocol'
method: dict_values
__contains__: v
	"___pyRichEqBool___, not the raw dunder: __eq__ may answer NotImplemented
	for a foreign operand, which is not a Boolean."
	mapping @env0:valuesDo: [:each | (each ___pyRichEqBool___: v) @env0:ifTrue: [^ true]].
	^ false
%

category: 'Grail-String Representation'
method: dict_values
__repr__
	^ self ___reprElementsPrefixed: 'dict_values('
%

category: 'Grail-Iterator Protocol'
method: dict_values
__iter__
	"Live value iterator (see dict_keys>>__iter__)."
	^ dict_valueiterator ___on: mapping
%

set compile_env: 0

! ------------------- Python value-attribute hook
category: 'Grail-Python Attribute Hook'
classmethod: dict_view
___pythonValueAttrs___
	"``view.mapping'' is a VALUE attribute (the read-only mappingproxy over
	the backing dict), not a callable -- without this ___pyAttrLoad___ wraps
	the accessor as a BoundMethod (test_dict test_views_mapping).  Inherited
	by dict_keys / dict_values / dict_items."

	^ IdentitySet @env0:new @env0:add: #'mapping'; yourself
%

! ------------------- element materialisation (env-0 subclass hook)
category: 'Grail-Private'
method: dict_keys
___elements
	| l |
	l := OrderedCollection new.
	mapping keysDo: [:k | l add: k].
	^ l
%

category: 'Grail-Private'
method: dict_items
___elements
	| l |
	l := OrderedCollection new.
	mapping keysAndValuesDo: [:k :v | l add: (tuple with: k with: v)].
	^ l
%

category: 'Grail-Private'
method: dict_values
___elements
	| l |
	l := OrderedCollection new.
	mapping valuesDo: [:v | l add: v].
	^ l
%

! ------------------- Smalltalk-collection compatibility (env-0)
category: 'Grail-Compat'
method: dict_view
do: aBlock
	(self ___elements) do: aBlock
%

category: 'Grail-Compat'
method: dict_view
size
	^ mapping size
%

category: 'Grail-Compat'
method: dict_view
isEmpty
	^ mapping isEmpty
%

category: 'Grail-Compat'
method: dict_view
notEmpty
	^ mapping isEmpty not
%

category: 'Grail-Compat'
method: dict_view
includes: anObject
	^ (self ___elements) includes: anObject
%

category: 'Grail-Compat'
method: dict_view
at: anIndex
	^ (self ___elements) at: anIndex
%

category: 'Grail-Compat'
method: dict_view
first
	^ (self ___elements) first
%

category: 'Grail-Compat'
method: dict_view
asArray
	^ (self ___elements) asArray
%
