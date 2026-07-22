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

category: 'Grail-Private'
method: dict_view
___setMapping: aDict
	mapping := aDict
%

category: 'Grail-Accessors'
method: dict_view
mapping
	"The backing dict (CPython 3.10+ dict view .mapping)."
	^ mapping
%

! ------------------- Python protocol (env-1)
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

category: 'Grail-Comparison'
method: dict_set_view
__eq__: other
	((other isKindOf: Set) @env0:or: [other isKindOf: dict_set_view])
		ifFalse: [^ false].
	^ (set @env1:__new__: self) __eq__: (set @env1:__new__: other)
%

category: 'Grail-Comparison'
method: dict_set_view
__ne__: other
	^ (self __eq__: other) @env0:not
%

category: 'Grail-Comparison'
method: dict_set_view
__le__: other
	^ (set @env1:__new__: self) __le__: (set @env1:__new__: other)
%

category: 'Grail-Comparison'
method: dict_set_view
__lt__: other
	^ (set @env1:__new__: self) __lt__: (set @env1:__new__: other)
%

category: 'Grail-Comparison'
method: dict_set_view
__ge__: other
	^ (set @env1:__new__: self) __ge__: (set @env1:__new__: other)
%

category: 'Grail-Comparison'
method: dict_set_view
__gt__: other
	^ (set @env1:__new__: self) __gt__: (set @env1:__new__: other)
%

category: 'Grail-Set Tests'
method: dict_set_view
isdisjoint: other
	^ (set @env1:__new__: self) isdisjoint: other
%

! ------------------- per-view Python membership + repr (env-1)
category: 'Grail-Collection Protocol'
method: dict_keys
__contains__: k
	^ mapping @env0:includesKey: k
%

category: 'Grail-String Representation'
method: dict_keys
__repr__
	^ 'dict_keys(' @env0:, (self @env0:___elements) __repr__ @env0:, ')'
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
	^ (mapping @env0:at: k) __eq__: v
%

category: 'Grail-String Representation'
method: dict_items
__repr__
	^ 'dict_items(' @env0:, (self @env0:___elements) __repr__ @env0:, ')'
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
	mapping @env0:valuesDo: [:each | (each __eq__: v) @env0:ifTrue: [^ true]].
	^ false
%

category: 'Grail-String Representation'
method: dict_values
__repr__
	^ 'dict_values(' @env0:, (self @env0:___elements) __repr__ @env0:, ')'
%

category: 'Grail-Iterator Protocol'
method: dict_values
__iter__
	"Live value iterator (see dict_keys>>__iter__)."
	^ dict_valueiterator ___on: mapping
%

set compile_env: 0

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
