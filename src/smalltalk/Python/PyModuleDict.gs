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

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
at: aKey
	| absent val |
	absent := Object new.
	val := source @env1:___globalAt___: aKey asSymbol otherwise: [absent].
	val == absent ifTrue: [^ source _errorKeyNotFound: aKey].
	^ val
%

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
at: aKey ifAbsent: aBlock
	| absent val |
	absent := Object new.
	val := source @env1:___globalAt___: aKey asSymbol otherwise: [absent].
	val == absent ifTrue: [^ aBlock value].
	^ val
%

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
includesKey: aKey
	| absent |
	absent := Object new.
	^ (source @env1:___globalAt___: aKey asSymbol otherwise: [absent]) ~~ absent
%

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
keysAndValuesDo: aBlock
	"Iterate over a SNAPSHOT of the name list (a lazy def-wrap during the
	walk caches into a dynamic slot; snapshotting keeps the iteration
	safe from that mutation).  Keys are Strings."

	| absent |
	absent := Object new.
	source @env1:___globalNames___ do: [:k |
		| v |
		v := source @env1:___globalAt___: k asSymbol otherwise: [absent].
		v == absent ifFalse: [aBlock value: k value: v]]
%

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
keys
	^ (source @env1:___globalNames___) asArray
%

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
size
	^ source @env1:___globalNames___ size
%

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
isEmpty
	^ source @env1:___globalNames___ isEmpty
%

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
notEmpty
	^ source @env1:___globalNames___ notEmpty
%

set compile_env: 1

category: 'Grail-Python-Protocol'
method: PyModuleDict
__getitem__: key
	| absent val |
	absent := Object @env0:new.
	val := source ___globalAt___: key @env0:asSymbol otherwise: [absent].
	val == absent ifTrue: [
		KeyError ___signal___: key @env0:printString].
	^ val
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
__contains__: key
	| absent |
	absent := Object @env0:new.
	^ (source ___globalAt___: key @env0:asSymbol otherwise: [absent]) ~~ absent
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
__len__
	^ source ___globalNames___ @env0:size
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
get: key _: default
	| absent val |
	absent := Object @env0:new.
	val := source ___globalAt___: key @env0:asSymbol otherwise: [absent].
	val == absent ifTrue: [^ default].
	^ val
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
keys
	| result |
	result := list ___new___.
	source ___globalNames___ @env0:do: [:k |
		result append: k @env0:asString].
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
		result append: (tuple @env0:withAll: { k @env0:asString. v })].
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
	validated first so a non-string raises the same catchable TypeError the
	write path does, instead of MNUing on ``asSymbol'' inside pop:."

	self ___keySymbolFor___: key.
	self pop: key
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
pop: key
	"Remove and return; KeyError when absent.  Removes from whichever
	store holds the binding (dynamic instVar first, then dict slot)."

	| sym val |
	sym := key @env0:asSymbol.
	val := source @env0:dynamicInstVarAt: sym.
	val == nil ifFalse: [
		source @env0:removeDynamicInstVar: sym.
		^ val].
	(source @env0:includesKey: sym) ifTrue: [
		val := source @env0:at: sym.
		source @env0:removeKey: sym.
		^ val].
	KeyError ___signal___: key @env0:printString
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
pop: key _: default
	| sym val |
	sym := key @env0:asSymbol.
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
	val := source ___globalAt___: key @env0:asSymbol otherwise: [absent].
	val == absent ifTrue: [
		source @env0:dynamicInstVarAt: key @env0:asSymbol put: default.
		^ default].
	^ val
%

set compile_env: 0
