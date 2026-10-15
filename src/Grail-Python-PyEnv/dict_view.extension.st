Extension { #name : 'dict_view' }

{ #category : 'Grail-Initialization' }
dict_view class >> ___on: aDict [
	| v |
	v := self ___new___.
	v ___setMapping: aDict.
	^ v

]

{ #category : 'Grail-Callable' }
dict_view class >> value: positional value: kwargs [
	"dict views are NOT constructible from Python: CPython's tp_new is NULL, so
	``type({}.keys())(...)'' (and the 0-arg form) raises TypeError.  This is the
	class-call entry for both direct ``Cls(...)'' and the indirect
	value:value: path; the internal ``___on:'' constructor bypasses it
	(test_dictviews test_constructors_not_callable)."

	^ TypeError ___signal___:
		'cannot create ''' @env0:, self @env0:name @env0:asString @env0:, ''' instances'

]

{ #category : 'Grail-String Representation' }
dict_view >> ___reprElementsPrefixed: aPrefix [
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

]

{ #category : 'Grail-Iterator Protocol' }
dict_view >> ___reverseIteratorClass___ [
	"The CPython reverse-iterator type for this view over a PyDict, or nil to
	reverse a snapshot (a mapping that keeps no entry positions)."

	^ nil

]

{ #category : 'Grail-Private' }
dict_view >> ___setMapping: aDict [
	mapping := aDict

]

{ #category : 'Grail-Copy Protocol' }
dict_view >> __copy__ [
	"dict views are not copyable -- CPython's copy.copy(d.keys()) raises
	TypeError (its default __reduce_ex__ refuses to pickle the view).  Grail's
	copy stub honors __copy__ first, so raising here is what makes copy.copy
	(and deepcopy, below) reject a view (test_dictviews test_copy)."

	^ TypeError ___signal___:
		'cannot copy ''' @env0:, self @env0:class @env0:name @env0:asString @env0:, ''' object'

]

{ #category : 'Grail-Copy Protocol' }
dict_view >> __deepcopy__: memo [
	"See __copy__: a view is not deep-copyable either."

	^ TypeError ___signal___:
		'cannot copy ''' @env0:, self @env0:class @env0:name @env0:asString @env0:, ''' object'

]

{ #category : 'Grail-Iterator Protocol' }
dict_view >> __iter__ [
	^ (self @env0:___elements) __iter__

]

{ #category : 'Grail-Collection Protocol' }
dict_view >> __len__ [
	^ mapping @env0:size

]

{ #category : 'Grail-Copy Protocol' }
dict_view >> __reduce_ex__: aProtocol [
	"CPython refuses to pickle a view: ``cannot pickle 'dict_keys' object''.
	Grail used to refuse by ACCIDENT -- pickle could not find the class under
	any module name -- and stopped the moment collections.abc became
	CPython's own, which binds ``dict_keys = type({}.keys())'' at module level
	for its registrations: pickle then found the class there, and the generic
	reduction pickled a view as an empty object (test_dictviews test_pickle)."

	^ TypeError ___signal___:
		('cannot pickle ''' @env0:, (bytes ___pyTypeNameOf___: self)
			@env0:, ''' object')

]

{ #category : 'Grail-Iterator Protocol' }
dict_view >> __reversed__ [
	| cls |
	cls := self ___reverseIteratorClass___.
	(cls @env0:~~ nil @env0:and: [mapping @env0:isKindOf: PyDict])
		ifTrue: [^ cls @env0:___on: mapping].
	^ (self @env0:___elements) __reversed__

]

{ #category : 'Grail-Accessors' }
dict_view >> mapping [
	"CPython dict-view ``.mapping'' (3.10+): a read-only mappingproxy over
	the LIVE backing dict, not the dict itself (test_dict
	test_views_mapping)."
	^ mappingproxy ___on: mapping

]
