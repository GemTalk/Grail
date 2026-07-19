! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- functools class (Python 'functools' module)
expectvalue /Class
doit
module subclass: 'functools'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
functools comment:
'Python functools module.

Provides higher-order functions and operations on callable objects.
Currently implements lru_cache as a pass-through (no caching) and reduce.
See https://docs.python.org/3/library/functools.html
'
%

expectvalue /Class
doit
functools category: 'Grail-Modules'
%

! ------- functools_cmpkey class (functools.cmp_to_key wrapper)
expectvalue /Class
doit
PythonInstance subclass: 'functools_cmpkey'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
functools_cmpkey category: 'Grail-Modules'
%

! ------- functools_singledispatch: the wrapper returned by singledispatch()
expectvalue /Class
doit
PythonInstance subclass: 'functools_singledispatch'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
functools_singledispatch category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
functools_singledispatch removeAllMethods: 1.
functools_singledispatch class removeAllMethods: 1.
%

! ------- functools_partial class (Python functools.partial)
expectvalue /Class
doit
PythonInstance subclass: 'functools_partial'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
functools_partial comment:
'Python functools.partial as a REAL class (CPython test_functools
subclasses it at import time; the previous closure-returning module
function could not be subclassed).  State lives in dynamic instVars
func / args / keywords, so attribute reads resolve through the
standard PythonInstance probe.  Construction is implemented as the
instance-side __new__ protocol (___new__:kw:) so ClassDefAst-emitted
subclass instantiation and direct partial(...) calls share it.'
%

expectvalue /Class
doit
functools_partial category: 'Grail-Modules'
%

! ------- functools_CacheInfo: the named 4-tuple lru_cache.cache_info() returns
expectvalue /Class
doit
PythonInstance subclass: 'functools_CacheInfo'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
functools_CacheInfo category: 'Grail-Modules'
%

! ------- functools_Placeholder: the type of functools.Placeholder (a singleton)
expectvalue /Class
doit
PythonInstance subclass: 'functools_Placeholder'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
functools_Placeholder category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
functools removeAllMethods: 1.
functools class removeAllMethods: 1.
functools_partial removeAllMethods: 1.
functools_partial class removeAllMethods: 1.
functools_cmpkey removeAllMethods: 1.
functools_cmpkey class removeAllMethods: 1.
functools_CacheInfo removeAllMethods: 1.
functools_CacheInfo class removeAllMethods: 1.
functools_Placeholder removeAllMethods: 1.
functools_Placeholder class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
method: functools
initialize
	"Bind the partial class.  The module attribute load falls through
	to SymbolDictionary storage once no partial:/-varargs methods
	shadow it, so ``functools.partial`` / ``from functools import
	partial`` yield the CLASS."

	self @env0:at: #partial put: functools_partial.
	"_CacheInfo: the named 4-tuple class lru_cache.cache_info() returns
	and test code constructs directly."
	self @env0:at: #'_CacheInfo' put: functools_CacheInfo.
	"Placeholder: the singleton sentinel for reserved positional slots
	in partial (Python 3.14).  Its type is functools_Placeholder;
	``Placeholder'' is that type's sole instance."
	self @env0:at: #Placeholder put: functools_Placeholder ___singleton___
%

category: 'Grail-Built-in Functions'
method: functools
cmp_to_key: mycmp
	"cmp_to_key(cmp) -> a key factory: key(x) wraps x so comparisons
	route through cmp (sorted/min/max with old-style comparators --
	test_functools exercises it directly)."

	^ [:___p___ :___k___ |
		| w o |
		o := (___p___ ~~ nil and: [___p___ @env0:size @env0:>= 1])
			ifTrue: [___p___ @env0:at: 1]
			ifFalse: [
				(___k___ ~~ nil and: [___k___ @env0:includesKey: 'obj'])
					ifTrue: [___k___ @env0:at: 'obj']
					ifFalse: [TypeError ___signal___: 'K() missing required argument: obj']].
		w := functools_cmpkey @env0:new.
		w @env0:dynamicInstVarAt: #obj put: o.
		w @env0:dynamicInstVarAt: #cmp put: mycmp.
		w]
%

category: 'Grail-Built-in Functions'
method: functools
_cmp_to_key: positional kw: kwargs
	"Varargs companion: cmp_to_key(mycmp=f) keyword form and
	argument-count errors (test_cmp_to_key)."

	| f |
	f := (positional @env0:size @env0:>= 1)
		ifTrue: [positional @env0:at: 1]
		ifFalse: [
			(kwargs ~~ nil and: [kwargs @env0:includesKey: 'mycmp'])
				ifTrue: [kwargs @env0:at: 'mycmp']
				ifFalse: [TypeError ___signal___: 'cmp_to_key() missing required argument: mycmp']].
	^ self cmp_to_key: f
%

category: 'Grail-Comparison'
method: functools_cmpkey
__lt__: other
	(other isKindOf: functools_cmpkey) ifFalse: [
		TypeError ___signal___: 'other argument must be K instance'].
	^ ((self @env0:dynamicInstVarAt: #cmp) value:
		{ self @env0:dynamicInstVarAt: #obj. other @env0:dynamicInstVarAt: #obj } value: nil)
		@env0:< 0
%

category: 'Grail-Comparison'
method: functools_cmpkey
__gt__: other
	(other isKindOf: functools_cmpkey) ifFalse: [
		TypeError ___signal___: 'other argument must be K instance'].
	^ ((self @env0:dynamicInstVarAt: #cmp) value:
		{ self @env0:dynamicInstVarAt: #obj. other @env0:dynamicInstVarAt: #obj } value: nil)
		@env0:> 0
%

category: 'Grail-Comparison'
method: functools_cmpkey
__le__: other
	(other isKindOf: functools_cmpkey) ifFalse: [
		TypeError ___signal___: 'other argument must be K instance'].
	^ ((self @env0:dynamicInstVarAt: #cmp) value:
		{ self @env0:dynamicInstVarAt: #obj. other @env0:dynamicInstVarAt: #obj } value: nil)
		@env0:<= 0
%

category: 'Grail-Comparison'
method: functools_cmpkey
__ge__: other
	(other isKindOf: functools_cmpkey) ifFalse: [
		TypeError ___signal___: 'other argument must be K instance'].
	^ ((self @env0:dynamicInstVarAt: #cmp) value:
		{ self @env0:dynamicInstVarAt: #obj. other @env0:dynamicInstVarAt: #obj } value: nil)
		@env0:>= 0
%

category: 'Grail-Comparison'
method: functools_cmpkey
__eq__: other
	(other isKindOf: functools_cmpkey) ifFalse: [
		TypeError ___signal___: 'other argument must be K instance'].
	^ ((self @env0:dynamicInstVarAt: #cmp) value:
		{ self @env0:dynamicInstVarAt: #obj. other @env0:dynamicInstVarAt: #obj } value: nil)
		@env0:= 0
%

category: 'Grail-Instantiation'
classmethod: functools_partial
value: positional value: keywords
	"partial(fn, *args, **kw) -- class-call entry.  Route through the
	__new__ protocol so subclass instantiation (ClassDefAst-emitted
	value:value: uses ___allocateInstance___) and direct calls share
	one constructor."

	^ self ___allocateInstance___: positional kw: keywords
%

category: 'Grail-Reflection'
classmethod: functools_partial
__module__
	"partial.__module__ -- test_repr builds the repr's name prefix from
	``{partial.__module__}.{partial.__qualname__}''."

	^ 'functools'
%

category: 'Grail-Reflection'
classmethod: functools_partial
__qualname__
	^ 'partial'
%

category: 'Grail-Instantiation'
method: functools_partial
___new__: positional kw: keywords
	"Constructor body.  self is the CLASS: ___allocateInstance___ runs a
	class-body __new__ non-virtually with the class as receiver, which
	also makes ``class Sub(partial): pass`` construct Sub instances."

	| inst fn rest kw ph |
	(positional == nil or: [positional @env0:isEmpty]) ifTrue: [
		TypeError ___signal___: 'partial expected at least 1 argument, got 0'].
	fn := positional @env0:at: 1.
	rest := positional @env0:size @env0:> 1
		ifTrue: [positional @env0:copyFrom: 2 to: positional @env0:size]
		ifFalse: [#()].
	kw := keywords == nil
		ifTrue: [KeyValueDictionary @env0:new]
		ifFalse: [keywords @env0:copy].
	ph := functools_Placeholder ___singleton___.
	"Placeholder is not allowed as a keyword-argument value (checked by
	identity, so ALWAYS_EQ -- which == everything -- is not treated as
	a Placeholder)."
	kw @env0:valuesDo: [:v | v == ph ifTrue: [
		TypeError ___signal___: 'Placeholder cannot be passed as a keyword argument']].
	"CPython flattens partial-of-partial: adopt the inner func, and the
	outer positional args FILL the inner's Placeholder slots (leftover
	outer args append); the OUTER keywords override the inner."
	(fn isKindOf: functools_partial) ifTrue: [
		| merged |
		rest := functools_partial
			___applyPlaceholders___: (fn @env0:dynamicInstVarAt: #args) @env0:asArray
			with: rest.
		merged := (fn @env0:dynamicInstVarAt: #keywords) @env0:copy.
		kw @env0:keysAndValuesDo: [:k :v | merged @env0:at: k put: v].
		kw := merged.
		fn := fn @env0:dynamicInstVarAt: #func].
	"Trailing Placeholders are not allowed (they could never be filled
	at call time)."
	(rest @env0:isEmpty @env0:not and: [(rest @env0:last) == ph]) ifTrue: [
		TypeError ___signal___: 'trailing Placeholders are not allowed'].
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #func put: fn.
	inst @env0:dynamicInstVarAt: #args put: (tuple @env0:withAll: rest).
	inst @env0:dynamicInstVarAt: #keywords put: kw.
	^ inst
%

category: 'Grail-Placeholder'
classmethod: functools_partial
___applyPlaceholders___: boundArgs with: newArgs
	"Fill each Placeholder in boundArgs with the next positional from
	newArgs (in order), passing non-Placeholder bound args through and
	appending any leftover newArgs.  A Placeholder with no newArg left
	to consume stays a Placeholder -- construction tolerates that
	(a mid-sequence reserved slot); the call path treats a surviving
	Placeholder as a missing argument."

	| ph result newList |
	ph := functools_Placeholder ___singleton___.
	result := OrderedCollection @env0:new.
	newList := OrderedCollection @env0:withAll:
		(newArgs == nil ifTrue: [#()] ifFalse: [newArgs]).
	boundArgs @env0:do: [:a |
		(a == ph)
			ifTrue: [
				newList @env0:isEmpty
					ifTrue: [result @env0:add: a]
					ifFalse: [result @env0:add: newList @env0:removeFirst]]
			ifFalse: [result @env0:add: a]].
	result @env0:addAll: newList.
	^ result @env0:asArray
%

category: 'Grail-Placeholder'
classmethod: functools_partial
___countPlaceholders___: anArray
	| ph n |
	ph := functools_Placeholder ___singleton___.
	n := 0.
	anArray @env0:do: [:a | a == ph ifTrue: [n := n @env0:+ 1]].
	^ n
%

category: 'Grail-Calling'
method: functools_partial
value: morePositional value: moreKw
	"Invoke: fn(*bound, *more, **{**boundKw, **moreKw}) -- later
	keywords override the bound ones (CPython semantics)."

	| fn allArgs bk allKw remaining |
	fn := self @env0:dynamicInstVarAt: #func.
	"Fill reserved Placeholder slots with the call's positional args
	(leftover call args append).  A Placeholder that survives means the
	caller supplied too few positionals -- CPython's exact message."
	allArgs := functools_partial
		___applyPlaceholders___: (self @env0:dynamicInstVarAt: #args) @env0:asArray
		with: (morePositional == nil ifTrue: [#()] ifFalse: [morePositional]).
	remaining := functools_partial ___countPlaceholders___: allArgs.
	remaining @env0:> 0 ifTrue: [
		TypeError ___signal___: ('missing positional arguments in ''partial'' call; expected at least '
			@env0:, (functools_partial ___countPlaceholders___:
				(self @env0:dynamicInstVarAt: #args) @env0:asArray) @env0:printString
			@env0:, ', got '
			@env0:, (morePositional == nil ifTrue: [0] ifFalse: [morePositional @env0:size]) @env0:printString)].
	bk := self @env0:dynamicInstVarAt: #keywords.
	allKw := (bk == nil or: [bk @env0:isEmpty])
		ifTrue: [moreKw]
		ifFalse: [
			(moreKw == nil or: [moreKw @env0:isEmpty])
				ifTrue: [bk]
				ifFalse: [
					| merged |
					merged := bk @env0:copy.
					moreKw @env0:keysAndValuesDo: [:k :v | merged @env0:at: k put: v].
					merged]].
	"value:value: is the universal call protocol -- BoundMethod, class
	objects (partial(int, base=2)), blocks, and nested partials all
	dispatch through it; ___pyCallValue___ rejects classes."
	^ fn value: allArgs value: allKw
%

category: 'Grail-String Representation'
method: functools_partial
__repr__
	"functools.partial(<func repr>, args..., k=v...)"

	| stream |
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	stream @env0:nextPutAll: 'functools.partial('.
	stream @env0:nextPutAll:
		((self @env0:dynamicInstVarAt: #func) __repr__) @env0:asString.
	(self @env0:dynamicInstVarAt: #args) @env0:do: [:a |
		stream @env0:nextPutAll: ', '.
		stream @env0:nextPutAll: (a __repr__) @env0:asString].
	(self @env0:dynamicInstVarAt: #keywords) @env0:keysAndValuesDo: [:k :v |
		stream @env0:nextPutAll: ', '.
		stream @env0:nextPutAll: k @env0:asString.
		stream @env0:nextPutAll: '='.
		stream @env0:nextPutAll: (v __repr__) @env0:asString].
	stream @env0:nextPut: $).
	^ stream @env0:contents
%

category: 'Grail-Pickle Protocol'
method: functools_partial
___reservedName___: aName
	"True for the three internal-state names (func / args / keywords),
	which are stored as dynamic instVars but must NOT appear in
	__dict__ and are read-only via attribute assignment."

	| s |
	s := aName @env0:asString.
	^ (s @env0:= 'func') or: [s @env0:= 'args' or: [s @env0:= 'keywords']]
%

category: 'Grail-Introspection'
method: functools_partial
__dict__
	"The instance namespace -- user attributes only (``p.attr = ...''),
	NOT the func/args/keywords internal state (those are C-level slots
	in CPython, absent from __dict__).  A fresh dict snapshot: partial's
	tests read it via signature() and compare by value; no test writes
	back through it."

	| d pairs |
	d := dict ___new___.
	pairs := self @env0:dynamicInstVarPairs.
	1 @env0:to: pairs @env0:size @env0:by: 2 do: [:i |
		| nm |
		nm := pairs @env0:at: i.
		(self ___reservedName___: nm) ifFalse: [
			d @env0:at: nm @env0:asString put: (pairs @env0:at: i @env0:+ 1)]].
	^ d
%

category: 'Grail-Attribute Access'
method: functools_partial
__setattr__: name _: value
	"func / args / keywords are read-only (CPython: AttributeError).
	Everything else is a normal user attribute."

	(self ___reservedName___: name) ifTrue: [
		AttributeError ___signal___: 'attribute ''' @env0:, name @env0:asString
			@env0:, ''' of ''functools.partial'' objects is not writable'].
	^ super __setattr__: name _: value
%

category: 'Grail-Attribute Access'
method: functools_partial
__delattr__: name
	"``del p.__dict__'' is forbidden (CPython: TypeError).  Other
	deletions fall through to the default."

	(name @env0:asString @env0:= '__dict__') ifTrue: [
		TypeError ___signal___: 'a partial object''s dictionary may not be deleted'].
	^ super __delattr__: name
%

category: 'Grail-Pickle Protocol'
method: functools_partial
__setstate__: state
	"Restore partial state from a 4-tuple (func, args, kwds, namespace)
	-- the pickle/copy protocol counterpart of __reduce__.  Validates
	shape and element types (CPython raises TypeError otherwise),
	coerces args to a plain tuple and kwds to a plain dict (tuple/dict
	SUBCLASSES are normalized), rejects a trailing Placeholder, and
	installs namespace as the instance __dict__ (None clears it)."

	| ph fn args kwds namespace kd pairs |
	(state isKindOf: tuple) ifFalse: [
		TypeError ___signal___: 'argument to __setstate__ must be a tuple'].
	(state @env0:size @env0:= 4) ifFalse: [
		TypeError ___signal___: 'expected 4 items in state, got '
			@env0:, state @env0:size @env0:printString].
	fn := state @env0:at: 1.
	args := state @env0:at: 2.
	kwds := state @env0:at: 3.
	namespace := state @env0:at: 4.
	(fn == None or: [fn == nil]) ifTrue: [
		TypeError ___signal___: 'the first argument must be callable'].
	(args isKindOf: tuple) ifFalse: [
		TypeError ___signal___: 'invalid partial state (args must be a tuple)'].
	((kwds == None) or: [kwds isKindOf: KeyValueDictionary]) ifFalse: [
		TypeError ___signal___: 'invalid partial state (kwds must be a dict)'].
	((namespace == None) or: [namespace isKindOf: KeyValueDictionary]) ifFalse: [
		TypeError ___signal___: 'invalid partial state (namespace must be a dict)'].
	ph := functools_Placeholder ___singleton___.
	(args @env0:isEmpty @env0:not and: [(args @env0:at: args @env0:size) == ph]) ifTrue: [
		TypeError ___signal___: 'trailing Placeholders are not allowed'].
	"Install internal state -- args to a PLAIN tuple, kwds to a PLAIN
	dict (test_setstate_subclasses requires exact tuple/dict types)."
	self @env0:dynamicInstVarAt: #func put: fn.
	self @env0:dynamicInstVarAt: #args put: (tuple @env0:withAll: args).
	kd := KeyValueDictionary @env0:new.
	(kwds ~~ None) ifTrue: [
		kwds @env0:keysAndValuesDo: [:k :v | kd @env0:at: k put: v]].
	self @env0:dynamicInstVarAt: #keywords put: kd.
	"Reset the instance __dict__: drop every user attribute (all
	dynamic instVars except the reserved three), then apply namespace."
	pairs := self @env0:dynamicInstVarPairs.
	1 @env0:to: pairs @env0:size @env0:by: 2 do: [:i |
		| nm |
		nm := pairs @env0:at: i.
		(self ___reservedName___: nm) ifFalse: [
			self @env0:removeDynamicInstVar: nm]].
	(namespace ~~ None) ifTrue: [
		namespace @env0:keysAndValuesDo: [:k :v |
			self @env0:dynamicInstVarAt: k @env0:asSymbol put: v]].
	^ None
%

! ===============================================================================
! functools_CacheInfo -- the named 4-tuple returned by cache_info()
! ===============================================================================

category: 'Grail-Instantiation'
classmethod: functools_CacheInfo
hits: h misses: m maxsize: x currsize: c
	| inst |
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #hits put: h.
	inst @env0:dynamicInstVarAt: #misses put: m.
	inst @env0:dynamicInstVarAt: #maxsize put: x.
	inst @env0:dynamicInstVarAt: #currsize put: c.
	^ inst
%

category: 'Grail-Instantiation'
classmethod: functools_CacheInfo
value: positional value: keywords
	"_CacheInfo(hits, misses, maxsize, currsize) -- accepts positional
	OR keyword arguments (test code builds it with keywords)."

	| pick |
	pick := [:idx :key |
		(positional ~~ nil and: [positional @env0:size @env0:>= idx])
			ifTrue: [positional @env0:at: idx]
			ifFalse: [(keywords ~~ nil and: [keywords @env0:includesKey: key])
				ifTrue: [keywords @env0:at: key]
				ifFalse: [None]]].
	^ self
		hits: (pick @env0:value: 1 value: 'hits')
		misses: (pick @env0:value: 2 value: 'misses')
		maxsize: (pick @env0:value: 3 value: 'maxsize')
		currsize: (pick @env0:value: 4 value: 'currsize')
%

category: 'Grail-Accessors'
method: functools_CacheInfo
hits
	^ self @env0:dynamicInstVarAt: #hits
%

category: 'Grail-Accessors'
method: functools_CacheInfo
misses
	^ self @env0:dynamicInstVarAt: #misses
%

category: 'Grail-Accessors'
method: functools_CacheInfo
maxsize
	^ self @env0:dynamicInstVarAt: #maxsize
%

category: 'Grail-Accessors'
method: functools_CacheInfo
currsize
	^ self @env0:dynamicInstVarAt: #currsize
%

category: 'Grail-Sequence'
method: functools_CacheInfo
___asArray___
	^ { self @env0:dynamicInstVarAt: #hits.
		self @env0:dynamicInstVarAt: #misses.
		self @env0:dynamicInstVarAt: #maxsize.
		self @env0:dynamicInstVarAt: #currsize }
%

category: 'Grail-Sequence'
method: functools_CacheInfo
__getitem__: idx
	"Namedtuples index like tuples (0-based)."

	^ self ___asArray___ @env0:at: idx @env0:+ 1
%

category: 'Grail-Sequence'
method: functools_CacheInfo
__len__
	^ 4
%

category: 'Grail-Comparison'
method: functools_CacheInfo
__eq__: other
	"Field-wise equality.  A namedtuple compares equal to another
	namedtuple (or plain tuple) with the same element values; compare
	element-by-element via the Python __eq__ so None/int match."

	| mine theirs |
	mine := self ___asArray___.
	theirs := (other isKindOf: functools_CacheInfo)
		ifTrue: [other ___asArray___]
		ifFalse: [(other isKindOf: SequenceableCollection)
			ifTrue: [other @env0:asArray]
			ifFalse: [^ false]].
	mine @env0:size @env0:= theirs @env0:size ifFalse: [^ false].
	1 @env0:to: mine @env0:size do: [:i |
		((mine @env0:at: i) __eq__: (theirs @env0:at: i)) == true
			ifFalse: [^ false]].
	^ true
%

category: 'Grail-Comparison'
method: functools_CacheInfo
__ne__: other
	^ (self __eq__: other) @env0:not
%

category: 'Grail-String Representation'
method: functools_CacheInfo
__repr__
	^ 'CacheInfo(hits=' @env0:, (self @env0:dynamicInstVarAt: #hits) __repr__ @env0:asString
		@env0:, ', misses=' @env0:, (self @env0:dynamicInstVarAt: #misses) __repr__ @env0:asString
		@env0:, ', maxsize=' @env0:, (self @env0:dynamicInstVarAt: #maxsize) __repr__ @env0:asString
		@env0:, ', currsize=' @env0:, (self @env0:dynamicInstVarAt: #currsize) __repr__ @env0:asString
		@env0:, ')'
%

! ===============================================================================
! functools_Placeholder -- singleton sentinel for reserved partial arg slots
! ===============================================================================

category: 'Grail-Singleton'
classmethod: functools_Placeholder
___singleton___
	"The sole Placeholder instance.  SESSION-LOCAL (SessionTemps):
	Placeholders are transient partial-construction sentinels compared
	by identity WITHIN a session and never committed (a value that
	needs to persist would not be a Placeholder).  Keeps the sentinel
	off any committed class -- see the session-state policy."

	| p |
	p := SessionTemps @env0:current @env0:at: #GrailFunctoolsPlaceholder otherwise: nil.
	p @env0:isNil ifTrue: [
		p := self @env0:new.
		SessionTemps @env0:current @env0:at: #GrailFunctoolsPlaceholder put: p].
	^ p
%

category: 'Grail-Singleton'
classmethod: functools_Placeholder
value: positional value: keywords
	"type(Placeholder)() returns the singleton; any argument raises
	TypeError (CPython: the Placeholder type takes no arguments)."

	((positional ~~ nil and: [positional @env0:isEmpty @env0:not])
		or: [keywords ~~ nil and: [keywords @env0:isEmpty @env0:not]]) ifTrue: [
		TypeError ___signal___: 'Placeholder() takes no arguments'].
	^ self ___singleton___
%

category: 'Grail-String Representation'
method: functools_Placeholder
__repr__
	^ 'Placeholder'
%

category: 'Grail-Built-in Functions'
method: functools
WRAPPER_ASSIGNMENTS
	"Tuple of attribute names ``functools.update_wrapper`` copies
	from wrapped to wrapper.  Matches CPython 3.x.  Grail's
	update_wrapper stub doesn't actually copy anything, but the
	constant is exported for callers that read it (jinja2.compiler
	splices it into a decorator's signature)."

	^ tuple @env0:withAll: #('__module__' '__name__' '__qualname__' '__annotations__' '__type_params__' '__doc__')
%

category: 'Grail-Built-in Functions'
method: functools
WRAPPER_UPDATES
	"Tuple of attribute names ``functools.update_wrapper`` MERGES
	from wrapped into wrapper (default: just ``__dict__``)."

	^ tuple @env0:withAll: #('__dict__')
%

! ===============================================================================
! Fast-path callables
! ===============================================================================

category: 'Grail-Built-in Functions'
method: functools
lru_cache: maxsize
	"lru_cache(maxsize) -> decorator.  The decorator wraps the user
	function in a LruCacheWrapper that memoizes results and exposes
	``cache_clear`` / ``cache_info``.

	``@lru_cache`` (bare, no parens) passes the FUNCTION directly as
	the sole argument -- CPython supports both that and
	``@lru_cache(maxsize=N)''.  The bare form uses CPython's default
	bound of 128; the ``(maxsize=N)'' form uses N.  ``maxsize'' is
	normally an Integer or None; anything else is the bare-decorator
	function, so wrap it immediately (default 128).  django.views.debug
	uses the bare form."

	((maxsize isKindOf: Integer)
		or: [maxsize == nil or: [maxsize == None]]) ifFalse: [
		^ LruCacheWrapper ___wrap___: maxsize maxsize: 128].
	^ [:positional2 :keywords2 |
		LruCacheWrapper ___wrap___: (positional2 @env0:at: 1) maxsize: maxsize]
%

category: 'Grail-Built-in Functions'
method: functools
_lru_cache: positional kw: kwargs
	"Varargs entry — ``lru_cache(maxsize=128, typed=False)'' from user
	code.  Honors the ``maxsize'' keyword (default 128, matching
	CPython); ``typed'' is accepted and ignored."

	| ms |
	ms := (kwargs ~~ nil and: [kwargs @env0:includesKey: 'maxsize'])
		ifTrue: [kwargs @env0:at: 'maxsize']
		ifFalse: [(positional ~~ nil and: [positional @env0:isEmpty @env0:not])
			ifTrue: [positional @env0:at: 1]
			ifFalse: [128]].
	^ [:positional2 :keywords2 |
		LruCacheWrapper ___wrap___: (positional2 @env0:at: 1) maxsize: ms]
%

category: 'Grail-Built-in Functions'
method: functools
cache: aFunction
	"``@cache'' (Python 3.9+) — shorthand for ``@lru_cache(maxsize=None)''
	with an unbounded cache."

	^ LruCacheWrapper ___wrap___: aFunction maxsize: None
%

category: 'Grail-Built-in Functions'
method: functools
cached_property: aFunction
	"cached_property(fn) — CPython decorator that turns a unary
	method into a lazily-computed, per-instance cached attribute.
	Grail stub: pass the function through as-is.  Callers that
	read `obj.attr` get a BoundMethod they can call; nothing
	gets cached.  Replace with real semantics if we start
	hitting hot-path attribute reads."

	^ aFunction
%

category: 'Grail-Built-in Functions'
method: functools
wraps: wrapped
	"wraps(wrapped) → decorator that copies metadata from wrapped
	onto the wrapper.  Stub: identity decorator."

	^ [:positional :keywords | positional @env0:at: 1]
%

category: 'Grail-Built-in Functions'
method: functools
_wraps: positional kw: kwargs
	"Varargs form of wraps for the ``assigned=...'' / ``updated=...''
	keyword variants used by jinja2.async_utils and CPython
	decorator chains.  Same identity-decorator stub — the kwargs
	carry attribute-list tuples that the real implementation would
	copy through; Grail's BoundMethod / closure shapes don't honour
	user-stamped ``__name__'' / ``__doc__'' anyway, so dropping them
	matches the behaviour of the 1-arg form."

	^ [:positional2 :keywords2 | positional2 @env0:at: 1]
%

category: 'Grail-Built-in Functions'
method: functools
update_wrapper: wrapper _: wrapped
	"functools.update_wrapper(wrapper, wrapped[, ...]) — copy
	identifying metadata (``__module__``, ``__name__``, ``__doc__``,
	``__dict__``, ``__wrapped__``) from wrapped onto wrapper.  Used
	by Jinja2's ``optimizeconst`` (and the rest of the decorator
	ecosystem) at module-init time.  Stub: return wrapper
	unchanged.  Grail's BoundMethod / closure shapes don't honor
	user-stamped ``__name__`` anyway, so the copy is a no-op until
	there's a real need."

	^ wrapper
%

category: 'Grail-Built-in Functions'
method: functools
_update_wrapper: positional kw: kwargs
	"Varargs form of update_wrapper for the ``assigned=`` /
	``updated=`` keyword variants — same identity stub."

	^ positional @env0:at: 1
%

category: 'Grail-Built-in Functions'
method: functools
partialmethod: aFunction
	"partialmethod(fn) with nothing bound — the descriptor behaves
	like the function itself."

	^ aFunction
%

category: 'Grail-Built-in Functions'
method: functools
_partialmethod: positional kw: kwargs
	"functools.partialmethod(fn, *bound, **boundKw).  CPython returns
	a descriptor that, accessed through an instance, prepends self
	before the bound args.  Grail class attrs holding closures are
	invoked unbound, so the closure takes the receiver explicitly as
	its first call argument: ``inst.m(*more)`` arrives here as
	``(inst, *more)`` and is forwarded as ``fn(inst, *bound, *more)''.
	Django's ORM (_get_FIELD_display, model deferred loading) only
	CONSTRUCTS these at class-definition time on the hello-world
	path."

	| fn boundArgs boundKw |
	(positional @env0:isNil or: [positional @env0:isEmpty]) ifTrue: [
		TypeError ___signal___: 'partialmethod expected at least 1 argument, got 0'
	].
	fn := positional @env0:at: 1.
	boundArgs := positional @env0:size @env0:> 1
		ifTrue: [positional @env0:copyFrom: 2 to: positional @env0:size]
		ifFalse: [#()].
	boundKw := kwargs.
	^ [:morePositional :moreKwargs |
		| callArgs rest allKw |
		callArgs := morePositional @env0:ifNil: [#()].
		callArgs @env0:isEmpty
			ifTrue: [rest := boundArgs]
			ifFalse: [
				"receiver first, then the partialmethod-bound args, then
				the remaining call args."
				rest := (Array @env0:with: (callArgs @env0:at: 1)) @env0:, boundArgs.
				callArgs @env0:size @env0:> 1 ifTrue: [
					rest := rest @env0:, (callArgs @env0:copyFrom: 2 to: callArgs @env0:size)]].
		allKw := (boundKw @env0:isNil or: [boundKw @env0:isEmpty])
			ifTrue: [moreKwargs]
			ifFalse: [
				(moreKwargs @env0:isNil or: [moreKwargs @env0:isEmpty])
					ifTrue: [boundKw]
					ifFalse: [
						| merged |
						merged := boundKw @env0:copy.
						moreKwargs @env0:keysAndValuesDo: [:k :v | merged @env0:at: k put: v].
						merged]].
		fn ___pyCallValue___: rest kw: allKw]
%

category: 'Grail-Built-in Functions'
method: functools
total_ordering: cls
	"functools.total_ordering(cls) — upstream synthesises the missing
	rich comparisons from __eq__ + one ordering method.  Grail's
	comparison dispatch already falls back pairwise (__lt__/__gt__
	swap), so pass the class through unchanged."

	^ cls
%

category: 'Grail-Built-in Functions'
method: functools
reduce: function _: iterable
	"reduce(function, iterable) -> value.
	Apply function of two arguments cumulatively to the items of
	iterable, from left to right."

	| result iter item |
	iter := iterable __iter__.
	result := iter __next__.
	[
		[
			item := iter __next__.
			result := function value: { result. item } value: nil.
		] repeat.
	] @env0:on: StopIteration do: [:ex | "done" ].
	^ result
%

category: 'Grail-Built-in Functions'
method: functools
reduce: function _: iterable _: initial
	"reduce(function, iterable, initial) -> value.
	Like reduce/2 but uses initial as the starting value."

	| result iter item |
	iter := iterable __iter__.
	result := initial.
	[
		[
			item := iter __next__.
			result := function value: { result. item } value: nil.
		] repeat.
	] @env0:on: StopIteration do: [:ex | "done" ].
	^ result
%

category: 'Grail-Single Dispatch'
method: functools
singledispatch: aFunc
	"functools.singledispatch(func) -- generic-function decorator.
	Returns a wrapper that dispatches on the TYPE of its first
	positional argument, walking that type's __mro__ (C3-aware for MI
	classes) for the most specific registered implementation and
	falling back to func."

	^ functools_singledispatch ___on: aFunc
%

category: 'Grail-Instance Creation'
classmethod: functools_singledispatch
___on: aFunc
	| inst |
	inst := self ___new___.
	inst @env0:dynamicInstVarAt: #default put: aFunc.
	inst @env0:dynamicInstVarAt: #registry put: IdentityKeyValueDictionary @env0:new.
	^ inst
%

category: 'Grail-Single Dispatch'
method: functools_singledispatch
value: positional value: keywords
	"Calling the generic function: dispatch on type(args[0])."

	| impl |
	positional @env0:isEmpty ifTrue: [
		TypeError ___signal___: 'singledispatch function requires at least 1 positional argument'].
	impl := self dispatch: (positional @env0:at: 1) @env0:class.
	^ impl value: positional value: keywords
%

category: 'Grail-Single Dispatch'
method: functools_singledispatch
dispatch: cls
	"First registered implementation along cls's __mro__, else the
	default.  Behavior>>__mro__ covers kernel classes (superclass
	chain) and MI user classes (C3 linearization) alike."

	| reg mro key |
	reg := self @env0:dynamicInstVarAt: #registry.
	"g.dispatch(int): bare builtin-type names arrive as BoundMethod
	wrappers here too -- normalize, tolerating non-classes."
	key := (self ___registryKey___: cls) @env0:ifNil: [cls].
	mro := key __mro__.
	mro @env0:do: [:c |
		(reg @env0:includesKey: c) ifTrue: [^ reg @env0:at: c]].
	"Python-semantics widenings the Smalltalk chain can't see:
	isinstance(x, str) is true for EVERY CharacterCollection (str maps
	to Unicode7 but a plain String's chain never passes it), and int
	subclasses are AbstractPyInt siblings of Integer."
	((key == CharacterCollection)
		or: [key @env0:inheritsFrom: CharacterCollection]) ifTrue: [
		(reg @env0:includesKey: Unicode7) ifTrue: [^ reg @env0:at: Unicode7]].
	((key == AbstractPyInt)
		or: [key @env0:inheritsFrom: AbstractPyInt]) ifTrue: [
		(reg @env0:includesKey: Integer) ifTrue: [^ reg @env0:at: Integer]].
	"ABC fallback: a registered key that is neither on the chain nor a
	widening may still match VIRTUALLY -- a collections.abc / numbers ABC
	recognizes cls through its ``__subclasscheck__'' hook (registration,
	whitelist, or structural protocol).  Scoped to hook-bearing keys so
	ordinary class keys cost nothing extra.  Note: no CPython-style
	ambiguity resolution between multiple matching ABCs -- Grail dicts are
	hash-ordered, so the first matching ABC wins."
	reg @env0:keysAndValuesDo: [:k :impl |
		((k isKindOf: Behavior)
			and: [(k @env0:class @env0:whichClassIncludesSelector: #'__subclasscheck__:' environmentId: 1) notNil
			and: [(k __subclasscheck__: key) == true]])
				ifTrue: [^ impl]].
	^ self @env0:dynamicInstVarAt: #default
%

category: 'Grail-Single Dispatch'
method: functools_singledispatch
___registryKey___: aKey
	"Normalize a registration key to a CLASS.  Bare builtin-type names
	(str, int, ...) reach here as first-class BoundMethods wrapping the
	builtins constructor; map the selector back through the Python
	symbol dictionary to the class it names."

	| sel resolved |
	(aKey isKindOf: Behavior) ifTrue: [^ aKey].
	(aKey isKindOf: BoundMethod) ifTrue: [
		sel := aKey @env0:selector.
		resolved := (System @env0:myUserProfile @env0:symbolList
			@env0:objectNamed: #Python) @env0:at: sel @env0:asSymbol otherwise: nil.
		(resolved @env0:notNil and: [resolved isKindOf: Behavior]) ifTrue: [
			^ resolved]].
	^ nil
%

category: 'Grail-Single Dispatch'
method: functools_singledispatch
register: clsOrFunc
	"Two forms:
	  * @g.register(cls) -- clsOrFunc is a CLASS: return a decorator
	    that registers the decorated function for cls and hands it back.
	  * @g.register -- clsOrFunc is the decorated FUNCTION itself
	    (Python 3.7+ annotation form): infer the dispatch class from
	    its first parameter's annotation, register, and return it."

	| key |
	key := self ___registryKey___: clsOrFunc.
	key @env0:isNil ifTrue: [
		"Not a class -> the annotation form: clsOrFunc is the function."
		| inferred |
		inferred := self ___inferRegisterType___: clsOrFunc.
		(self @env0:dynamicInstVarAt: #registry) @env0:at: inferred put: clsOrFunc.
		^ clsOrFunc].
	^ [:positional2 :keywords2 |
		| fn |
		fn := positional2 @env0:at: 1.
		(self @env0:dynamicInstVarAt: #registry) @env0:at: key put: fn.
		fn]
%

category: 'Grail-Single Dispatch'
method: functools_singledispatch
___inferRegisterType___: aFunc
	"Infer the dispatch type for the annotation form of register from
	aFunc's first-parameter annotation (__annotations__ minus the
	``return'' entry).  A forward-reference annotation (a string) is
	resolved against the Python globals.  Raises TypeError when no
	usable annotation is present -- CPython requires the first
	parameter be annotated with a class in this form.

	Note: Grail dicts are hash-ordered, so ``first parameter'' is only
	unambiguous when exactly one parameter is annotated -- the shape
	the annotation form is used in (``def _(arg: T)'')."

	| ann candidate |
	ann := [aFunc __annotations__] @env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	(ann @env0:isNil or: [ann @env0:isEmpty]) ifTrue: [
		TypeError ___signal___:
			'Invalid first argument to `register()`: no type annotation found'].
	candidate := nil.
	ann @env0:keysAndValuesDo: [:k :v |
		(k @env0:asString @env0:= 'return') ifFalse: [candidate := v]].
	candidate @env0:isNil ifTrue: [
		TypeError ___signal___:
			'Invalid first argument to `register()`: no parameter annotation found'].
	"Resolve a forward-reference string against the Python globals."
	(candidate isKindOf: CharacterCollection) ifTrue: [
		candidate := (System @env0:myUserProfile @env0:symbolList
			@env0:objectNamed: candidate @env0:asSymbol) @env0:ifNil: [candidate]].
	"Still a string?  ABC names ('Mapping', 'Sequence', ...) live as
	classes on the collections.abc module, not in the symbol list --
	resolve through sys.modules when that module has been imported."
	(candidate isKindOf: CharacterCollection) ifTrue: [
		| cabc resolved |
		cabc := (System @env0:myUserProfile @env0:symbolList
			@env0:objectNamed: #importlib) modules
			@env0:at: #'collections.abc' otherwise: nil.
		cabc == nil ifFalse: [
			resolved := cabc @env0:dynamicInstVarAt: candidate @env0:asString @env0:asSymbol.
			(resolved ~~ nil and: [resolved isKindOf: Behavior])
				ifTrue: [candidate := resolved]]].
	^ (self ___registryKey___: candidate) @env0:ifNil: [candidate]
%

category: 'Grail-Single Dispatch'
method: functools_singledispatch
register: cls _: aFunc
	"g.register(cls, impl) direct form."

	| key |
	key := self ___registryKey___: cls.
	key @env0:isNil ifTrue: [
		TypeError ___signal___: 'Invalid first argument to `register()`: not a class'].
	(self @env0:dynamicInstVarAt: #registry) @env0:at: key put: aFunc.
	^ aFunc
%

category: 'Grail-Single Dispatch'
method: functools_singledispatch
_register: positional kw: kwargs
	positional @env0:size @env0:>= 2 ifTrue: [
		^ self register: (positional @env0:at: 1) _: (positional @env0:at: 2)].
	^ self register: (positional @env0:at: 1)
%

category: 'Grail-Single Dispatch'
method: functools_singledispatch
registry
	^ self @env0:dynamicInstVarAt: #registry
%

set compile_env: 0
