Extension { #name : 'dict_set_view' }

{ #category : 'Grail-Comparison' }
dict_set_view >> ___cmpElements___: other [
	"other's elements as a Smalltalk collection (another view's ___elements, or
	any set-like materialized via list())."

	(other isKindOf: dict_view) ifTrue: [^ other @env0:___elements].
	^ (list @env1:__new__: other) @env0:asArray

]

{ #category : 'Grail-Comparison' }
dict_set_view >> ___each___: elemColl containedIn: container [
	"True iff every element of elemColl tests `in` container via Python
	__contains__ (whose value __eq__, for dict_items, may raise -- let it)."

	elemColl @env0:do: [:item |
		(container @env1:__contains__: item) @env1:___isTruthy___ ifFalse: [^ false]].
	^ true

]

{ #category : 'Grail-Set Operations (Operators)' }
dict_set_view >> __and__: other [
	^ (set @env1:__new__: self) intersection: other

]

{ #category : 'Grail-Comparison' }
dict_set_view >> __eq__: other [
	((other isKindOf: Set) @env0:or: [other isKindOf: dict_set_view])
		ifFalse: [^ false].
	(self @env0:size @env0:= (other @env0:size)) ifFalse: [^ false].
	^ self ___each___: (self @env0:___elements) containedIn: other

]

{ #category : 'Grail-Comparison' }
dict_set_view >> __ge__: other [
	(self @env0:size @env0:< (other @env0:size)) ifTrue: [^ false].
	^ self ___each___: (self ___cmpElements___: other) containedIn: self

]

{ #category : 'Grail-Comparison' }
dict_set_view >> __gt__: other [
	(self @env0:size @env0:> (other @env0:size)) ifFalse: [^ false].
	^ self ___each___: (self ___cmpElements___: other) containedIn: self

]

{ #category : 'Grail-Hashing' }
dict_set_view >> __hash__ [
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

]

{ #category : 'Grail-Comparison' }
dict_set_view >> __le__: other [
	(self @env0:size @env0:> (other @env0:size)) ifTrue: [^ false].
	^ self ___each___: (self @env0:___elements) containedIn: other

]

{ #category : 'Grail-Comparison' }
dict_set_view >> __lt__: other [
	(self @env0:size @env0:< (other @env0:size)) ifFalse: [^ false].
	^ self ___each___: (self @env0:___elements) containedIn: other

]

{ #category : 'Grail-Comparison' }
dict_set_view >> __ne__: other [
	^ (self __eq__: other) @env0:not

]

{ #category : 'Grail-Set Operations (Operators)' }
dict_set_view >> __or__: other [
	^ (set @env1:__new__: self) union: other

]

{ #category : 'Grail-Set Operations (Operators)' }
dict_set_view >> __rand__: other [
	^ (set @env1:__new__: self) intersection: other

]

{ #category : 'Grail-Set Operations (Operators)' }
dict_set_view >> __ror__: other [
	^ (set @env1:__new__: other) union: self

]

{ #category : 'Grail-Set Operations (Operators)' }
dict_set_view >> __rsub__: other [
	^ (set @env1:__new__: other) difference: self

]

{ #category : 'Grail-Set Operations (Operators)' }
dict_set_view >> __rxor__: other [
	^ (set @env1:__new__: self) symmetric_difference: other

]

{ #category : 'Grail-Set Operations (Operators)' }
dict_set_view >> __sub__: other [
	^ (set @env1:__new__: self) difference: other

]

{ #category : 'Grail-Set Operations (Operators)' }
dict_set_view >> __xor__: other [
	^ (set @env1:__new__: self) symmetric_difference: other

]

{ #category : 'Grail-Set Tests' }
dict_set_view >> isdisjoint: other [
	^ (set @env1:__new__: self) isdisjoint: other

]
