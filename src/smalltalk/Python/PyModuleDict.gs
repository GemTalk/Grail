! ------------------- Superclass check
run
PyInstanceDict ifNil: [self error: 'PyInstanceDict is not defined. Check file ordering.'].
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- PyModuleDict — the live view behind ``globals()`` / ``mod.__dict__``.
!
! A module's namespace spans three stores (docs/LEGB.md): dynamic instVars
! (user globals, insertion-ordered), the legacy SymbolDictionary slot
! (built-in module data attributes, __doc__), and the module class's own
! env-1 methods (top-level defs, lazily wrapped as BoundMethods on first
! read).  The raw module instance is therefore incoherent as a Python dict
! (``g['x']`` hit the dict slot while codegen stores globals in dynamic
! instVars; ``g.keys()`` executed the inherited kernel method).  This view
! reads through module>>___globalAt___:otherwise: (the SAME chain bare-name
! reads use) and enumerates module>>___globalNames___, so every binding is
! visible whichever store holds it.  Writes land in dynamic instVars — the
! canonical home, probed FIRST by all readers — via the inherited
! PyInstanceDict mutators.
expectvalue /Class
doit
PyInstanceDict subclass: 'PyModuleDict'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyModuleDict comment:
'Live view of a module''s global namespace as a Python dict — returned by
``globals()``, module-scope ``locals()``/``vars()``, and ``mod.__dict__``.
Reads resolve through module>>___globalAt___:otherwise: (dynamic instVars,
lazily-wrapped top-level defs, legacy dict-slot entries); writes create
real module globals (dynamic instVars).  ``source'' is the module
singleton.  See docs/LEGB.md.'
%

expectvalue /Class
doit
PyModuleDict category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
PyModuleDict removeAllMethods.
PyModuleDict class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Instance Creation'
classmethod: PyModuleDict
on: aModule
	"ONE view per module per session -- CPython contract: ``locals() is
	globals()'' at module scope, and ``mod.__dict__'' is the same object
	on every read.  The memo lives in SessionTemps (session-local,
	identity-keyed): the view is a transient convenience object and must
	NOT become reachable from a committed canonical module, which a
	dynamic-instVar cache on the module would do."

	| st cache key inst |
	st := SessionTemps current.
	cache := st at: #'GrailModuleDictViews' otherwise: nil.
	cache isNil ifTrue: [
		cache := IdentityKeyValueDictionary new.
		st at: #'GrailModuleDictViews' put: cache].
	"The eval/exec path compiles globals()/locals() with a nil receiver
	(Executed Code has no module instance -- its scope is the symbol-list
	SymbolDictionary).  nil can't key the identity cache; memoise under a
	sentinel so ``locals() is globals()'' still holds there, exactly as
	the old emit-self rewrite did (nil is nil)."
	key := aModule isNil ifTrue: [#'GrailNilModule'] ifFalse: [aModule].
	inst := cache at: key otherwise: nil.
	inst isNil ifTrue: [
		inst := super on: aModule.
		cache at: key put: inst].
	^ inst
%

category: 'Grail-Instance Creation'
classmethod: PyModuleDict
___forModuleNamed___: aName
	"The live namespace view for the loaded module called ``aName'', or nil.

	The name-keyed counterpart to ``on:'', for the callables that know WHERE they
	were defined but hold no reference to the module itself: a function's
	``__globals__''.  FunctionDefAst stamps ``__module__'' on every def and
	lambda, so the name is always to hand -- which makes this one sys.modules
	probe, against the scan over every loaded module's __file__ that
	PyFrame >> f_globals must do (it starts from a code object's co_filename and
	has no name at all).

	Nil, never an error, for three separate misses -- no name, Grail's
	``<closure>'' placeholder where a real module name would be, and a name that
	no longer resolves -- because the callers turn all three into the same
	AttributeError and none of them is exceptional.  A module can genuinely leave
	sys.modules while a function defined in it is still reachable.

	Answers the SAME object ``on:'' would, since it delegates: identity across
	``globals()'', ``mod.__dict__'' and ``f.__globals__'' is the contract
	test_funcattrs checks with assertIs."

	| nm mod |
	aName isNil ifTrue: [^ nil].
	nm := [aName @env0:asString] @env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	nm isNil ifTrue: [^ nil].
	(nm @env0:isEmpty or: [nm = '<closure>']) ifTrue: [^ nil].
	mod := [(importlib @env1:modules) @env0:at: nm @env0:asSymbol otherwise: nil]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	mod isNil ifTrue: [^ nil].
	^ [self @env0:on: mod] @env0:on: AbstractException do: [:ex | ex @env0:return: nil]
%

category: 'Grail-Non-String Keys'
method: PyModuleDict
___stringKeysDo___: aBlock
	"A module's string keys are NOT only its dynamic instVars -- a global also
	lives in the legacy SymbolDictionary slot or as a lazily-wrapped class method,
	and ___globalNames___ is what knows all three.  Overridden so
	___stringKeyEqualTo___: can see them.

	AND ``__dir__'', which is a strictly larger set here.  The case this exists for
	is ``builtins.__dict__[CustomStr('iter')]'', and ``iter'' is a builtin FUNCTION:
	``'iter' in builtins.__dict__'' is true because ___globalAt___ resolves it,
	but ___globalNames___ does not list it (96 names where CPython has 159), so a
	scan of the names alone could not find the key the membership test says is
	there.  builtins >> __dir__ exists precisely to rewrite those mangled
	``_name:kw:'' selectors back to their Python spellings, so it knows them.

	The union is not merely wider, it is CONSISTENT: whatever ___stringKeyEqualTo___:
	matches is then read through ___globalAt___, which resolves the same broader
	set.  Guarded, because __dir__ can be user-defined and raise."

	source @env1:___globalNames___ do: [:k | aBlock value: k asSymbol].
	[(source @env1:__dir__) do: [:k |
		(k isKindOf: CharacterCollection) ifTrue: [aBlock value: k asSymbol]]]
		on: AbstractException do: [:ex | ex return: nil]
%

category: 'Grail-Non-String Keys'
method: PyModuleDict
___moduleValueAt___: key ifAbsent: aBlock
	"The value bound to key in this module's namespace, or aBlock's value.

	The ONE funnel for keyed reads, so a non-string key is reached the same way
	everywhere.  A module's globals live in three places -- dynamic instVars,
	lazily-wrapped class methods, and the legacy SymbolDictionary slots -- and
	___globalAt___ already knows all three; what it cannot take is a non-Symbol
	name, so those go to the overflow dict instead.  See PyInstanceDict >>
	___overflowSlot___ for why there is one."

	(self ___isNamespaceStringKey___: key) ifFalse: [
		"A string-EQUAL key resolves through the string side; see PyInstanceDict >>
		___stringKeyEqualTo___:."
		(self ___stringKeyEqualTo___: key) @env0:ifNotNil: [:sym |
			^ source @env1:___globalAt___: sym otherwise: aBlock].
		^ (self ___overflow___)
			@env0:ifNil: [aBlock @env0:value]
			@env0:ifNotNil: [:d |
				d @env0:at: key ifAbsent: [^ aBlock @env0:value]]].
	^ source @env1:___globalAt___: key @env0:asSymbol otherwise: aBlock
%

category: 'Grail-Non-String Keys'
method: PyModuleDict
___moduleKeys___
	"Every key in this module's namespace: the global NAMES, then the non-string
	keys.  The one funnel for enumeration, so the overflow cannot be visible
	through ``keys'' and invisible through ``__len__''.

	Names come back as they are stored -- Strings from ___globalNames___, the
	original objects from the overflow.  Callers that hand keys to Python convert.

	ORDER: string keys first, then non-string, as in PyInstanceDict >>
	___allPairs___ and for the same reason."

	| result |
	result := OrderedCollection @env0:new.
	result @env0:addAll: (source @env1:___globalNames___).
	(self ___overflow___) @env0:ifNotNil: [:d |
		d @env0:keysDo: [:k | result @env0:add: k]].
	^ result
%

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
at: aKey
	| absent val |
	absent := Object new.
	val := self ___moduleValueAt___: aKey ifAbsent: [absent].
	val == absent ifTrue: [^ source _errorKeyNotFound: aKey].
	^ val
%

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
at: aKey ifAbsent: aBlock
	| absent val |
	absent := Object new.
	val := self ___moduleValueAt___: aKey ifAbsent: [absent].
	val == absent ifTrue: [^ aBlock value].
	^ val
%

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
includesKey: aKey
	| absent |
	absent := Object new.
	^ (self ___moduleValueAt___: aKey ifAbsent: [absent]) ~~ absent
%

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
keysAndValuesDo: aBlock
	"Iterate over a SNAPSHOT of the name list (a lazy def-wrap during the
	walk caches into a dynamic slot; snapshotting keeps the iteration
	safe from that mutation).  Keys are Strings."

	| absent |
	absent := Object new.
	self ___moduleKeys___ do: [:k |
		| v |
		v := self ___moduleValueAt___: k ifAbsent: [absent].
		v == absent ifFalse: [aBlock value: k value: v]]
%

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
keys
	^ self ___moduleKeys___ asArray
%

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
size
	^ self ___moduleKeys___ size
%

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
isEmpty
	^ self ___moduleKeys___ isEmpty
%

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
notEmpty
	^ self ___moduleKeys___ notEmpty
%

set compile_env: 1

category: 'Grail-Python-Protocol'
method: PyModuleDict
__getitem__: key
	| absent val |
	absent := Object @env0:new.
	val := self @env0:___moduleValueAt___: key ifAbsent: [absent].
	val == absent ifTrue: [
		KeyError ___signal___: key].
	^ val
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
__contains__: key
	| absent |
	absent := Object @env0:new.
	^ (self @env0:___moduleValueAt___: key ifAbsent: [absent]) ~~ absent
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
__len__
	^ self @env0:___moduleKeys___ @env0:size
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
get: key _: default
	| absent val |
	absent := Object @env0:new.
	val := self @env0:___moduleValueAt___: key ifAbsent: [absent].
	val == absent ifTrue: [^ default].
	^ val
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
keys
	"Keys the module holds under a NON-STRING key are yielded as they are, not
	``asString''ed: a Python caller must get the object back, and the ones that
	sift a namespace with ``isinstance(k, str)'' depend on it."
	| result |
	result := list ___new___.
	self @env0:___moduleKeys___ @env0:do: [:k |
		result append: (self @env0:___pythonKeyFor___: k)].
	^ result
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
values
	| result |
	result := list ___new___.
	self @env0:keysAndValuesDo: [:k :v | result append: v].
	^ result
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
items
	| result |
	result := list ___new___.
	self @env0:keysAndValuesDo: [:k :v |
		result append: (tuple @env0:withAll: {
			self @env0:___pythonKeyFor___: k. v })].
	^ result
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
__delitem__: key
	"``del mod.__dict__[name]''.  A module __dict__ is an ordinary mutable
	dict in CPython, so deletion is part of its contract; without this
	method the generic fallback in Object>>_doesNotUnderstand:... raised
	``'PyModuleDict' object does not support item deletion'' for every
	module, ``del builtins.__dict__['iter']'' included (test_iter
	test_reduce_mutating_builtins_iter).  pop: already removes from
	whichever store holds the binding -- dynamic instVar first, then dict
	slot -- and raises KeyError when absent, which is exactly CPython's
	behaviour, so this is only the dunder spelling of it.  The key is
	A NON-STRING key is deleted rather than refused.  This used to validate the
	key first, so ``del globals()[0]'' raised the TypeError that belongs to a
	non-string ATTRIBUTE NAME -- but a module dict is an ordinary dict in CPython
	and takes any hashable key, so there is now something real to delete.  pop:
	reaches the overflow for it."

	self pop: key
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
pop: key
	"Remove and return; KeyError when absent.  Removes from whichever
	store holds the binding (dynamic instVar first, then dict slot).

	A non-string key lives in neither, so it is taken from the overflow first --
	before ``asSymbol'' below, which such a key does not understand."

	| sym val |
	(self @env0:___isNamespaceStringKey___: key) ifFalse: [
		"A string-EQUAL key is removed from the string side, where it lives."
		sym := self @env0:___stringKeyEqualTo___: key.
		sym == nil ifTrue: [
			(self @env0:___overflow___) @env0:ifNotNil: [:d |
				d @env0:at: key ifAbsent: [KeyError ___signal___: key].
				val := d @env0:at: key.
				d @env0:removeKey: key ifAbsent: [nil].
				^ val].
			KeyError ___signal___: key]]
		ifTrue: [sym := key @env0:asSymbol].
	val := source @env0:dynamicInstVarAt: sym.
	val == nil ifFalse: [
		source @env0:removeDynamicInstVar: sym.
		^ val].
	(source @env0:includesKey: sym) ifTrue: [
		val := source @env0:at: sym.
		source @env0:removeKey: sym.
		^ val].
	KeyError ___signal___: key
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
pop: key _: default
	| sym val |
	(self @env0:___isNamespaceStringKey___: key) ifFalse: [
		sym := self @env0:___stringKeyEqualTo___: key.
		sym == nil ifTrue: [
			(self @env0:___overflow___) @env0:ifNotNil: [:d |
				d @env0:at: key ifAbsent: [^ default].
				val := d @env0:at: key.
				d @env0:removeKey: key ifAbsent: [nil].
				^ val].
			^ default]]
		ifTrue: [sym := key @env0:asSymbol].
	val := source @env0:dynamicInstVarAt: sym.
	val == nil ifFalse: [
		source @env0:removeDynamicInstVar: sym.
		^ val].
	(source @env0:includesKey: sym) ifTrue: [
		val := source @env0:at: sym.
		source @env0:removeKey: sym.
		^ val].
	^ default
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
copy
	"``globals().copy()'' -- a SNAPSHOT, as a plain dict.

	CPython's globals() IS a dict, so copy() returns an ordinary dict that no
	longer tracks the module.  Grail's globals() is a LIVE view, which makes the
	distinction load-bearing rather than academic: the whole point of copying is
	to get a namespace you can mutate without touching the module, which is what
	``custom_globals = globals().copy(); custom_globals[k] = v'' relies on (the
	eval-with-custom-globals idiom in test_traceback's suggestion tests, and a
	common one outside them).  Returning another live view would write those
	mutations straight back into the module."

	| d |
	d := dict ___new___.
	self @env0:keysAndValuesDo: [:k :v |
		d __setitem__: k @env0:asString _: v].
	^ d
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
popitem
	"Remove and return one (key, value) pair; KeyError when empty.

	CPython's dict.popitem is LIFO -- it removes the last-inserted pair.  Grail's
	module storage spans dynamic instVars and dict slots with no single insertion
	order to honour, so this removes the last pair this view enumerates, which is
	the same pair a caller draining the mapping would expect to see next."

	| pairs last |
	pairs := self items.
	(pairs __len__) @env0:= 0 ifTrue: [
		KeyError ___signal___: 'popitem(): dictionary is empty'].
	last := pairs __getitem__: (pairs __len__) @env0:- 1.
	self pop: (last __getitem__: 0).
	^ last
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
__or__: other
	"PEP 584 ``globals() | other'' -- a new plain dict, module untouched.

	Same reasoning as copy(): the result is a dict, not a view, because CPython's
	operand is a dict and the result must not write through to the module."

	| d |
	d := self copy.
	d update: other.
	^ d
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
__ior__: other
	"PEP 584 ``globals() |= other'' -- an IN-PLACE merge, so this one DOES write
	through to the module, exactly as ``globals().update(other)'' does."

	self update: other.
	^ self
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
setdefault: key _: default
	"Read through the FULL chain (a dict-slot or def binding counts as
	present); write, when absent, to the canonical dynamic-instVar home."

	| absent val |
	absent := Object @env0:new.
	val := self @env0:___moduleValueAt___: key ifAbsent: [absent].
	val == absent ifTrue: [
		self @env0:___rawAt___: key put: default.
		^ default].
	^ val
%

set compile_env: 0
