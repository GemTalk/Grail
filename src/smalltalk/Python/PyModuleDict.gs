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
	st := SessionTemps @env0:current.
	cache := st @env0:at: #'GrailModuleDictViews' otherwise: nil.
	cache @env0:isNil ifTrue: [
		cache := IdentityKeyValueDictionary @env0:new.
		st @env0:at: #'GrailModuleDictViews' put: cache].
	"The eval/exec path compiles globals()/locals() with a nil receiver
	(Executed Code has no module instance -- its scope is the symbol-list
	SymbolDictionary).  nil can't key the identity cache; memoise under a
	sentinel so ``locals() is globals()'' still holds there, exactly as
	the old emit-self rewrite did (nil is nil)."
	key := aModule @env0:isNil ifTrue: [#'GrailNilModule'] ifFalse: [aModule].
	inst := cache @env0:at: key otherwise: nil.
	inst @env0:isNil ifTrue: [
		inst := super @env0:on: aModule.
		cache @env0:at: key put: inst].
	^ inst
%

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
at: aKey
	| absent val |
	absent := Object new.
	val := source @env1:___globalAt___: aKey @env0:asSymbol otherwise: [absent].
	val == absent ifTrue: [^ source @env0:_errorKeyNotFound: aKey].
	^ val
%

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
at: aKey ifAbsent: aBlock
	| absent val |
	absent := Object new.
	val := source @env1:___globalAt___: aKey @env0:asSymbol otherwise: [absent].
	val == absent ifTrue: [^ aBlock @env0:value].
	^ val
%

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
includesKey: aKey
	| absent |
	absent := Object new.
	^ (source @env1:___globalAt___: aKey @env0:asSymbol otherwise: [absent]) ~~ absent
%

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
keysAndValuesDo: aBlock
	"Iterate over a SNAPSHOT of the name list (a lazy def-wrap during the
	walk caches into a dynamic slot; snapshotting keeps the iteration
	safe from that mutation).  Keys are Strings."

	| absent |
	absent := Object new.
	source @env1:___globalNames___ @env0:do: [:k |
		| v |
		v := source @env1:___globalAt___: k @env0:asSymbol otherwise: [absent].
		v == absent ifFalse: [aBlock @env0:value: k value: v]]
%

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
keys
	^ (source @env1:___globalNames___) @env0:asArray
%

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
size
	^ source @env1:___globalNames___ @env0:size
%

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
isEmpty
	^ source @env1:___globalNames___ @env0:isEmpty
%

category: 'Grail-Smalltalk-Protocol'
method: PyModuleDict
notEmpty
	^ source @env1:___globalNames___ @env0:notEmpty
%

set compile_env: 1

category: 'Grail-Python-Protocol'
method: PyModuleDict
__getitem__: key
	| absent val |
	absent := Object @env0:new.
	val := source @env1:___globalAt___: key @env0:asSymbol otherwise: [absent].
	val @env0:== absent ifTrue: [
		KeyError @env1:___signal___: key @env0:printString].
	^ val
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
__contains__: key
	| absent |
	absent := Object @env0:new.
	^ (source @env1:___globalAt___: key @env0:asSymbol otherwise: [absent]) @env0:~~ absent
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
__len__
	^ source @env1:___globalNames___ @env0:size
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
get: key _: default
	| absent val |
	absent := Object @env0:new.
	val := source @env1:___globalAt___: key @env0:asSymbol otherwise: [absent].
	val @env0:== absent ifTrue: [^ default].
	^ val
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
keys
	| result |
	result := list ___new___.
	source @env1:___globalNames___ @env0:do: [:k |
		result @env1:append: k @env0:asString].
	^ result
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
values
	| result |
	result := list ___new___.
	self @env0:keysAndValuesDo: [:k :v | result @env1:append: v].
	^ result
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
items
	| result |
	result := list ___new___.
	self @env0:keysAndValuesDo: [:k :v |
		result @env1:append: (tuple @env0:withAll: { k @env0:asString. v })].
	^ result
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
pop: key
	"Remove and return; KeyError when absent.  Removes from whichever
	store holds the binding (dynamic instVar first, then dict slot)."

	| sym val |
	sym := key @env0:asSymbol.
	val := source @env0:dynamicInstVarAt: sym.
	val @env0:== nil ifFalse: [
		source @env0:removeDynamicInstVar: sym.
		^ val].
	(source @env0:includesKey: sym) ifTrue: [
		val := source @env0:at: sym.
		source @env0:removeKey: sym.
		^ val].
	KeyError @env1:___signal___: key @env0:printString
%

category: 'Grail-Python-Protocol'
method: PyModuleDict
pop: key _: default
	| sym val |
	sym := key @env0:asSymbol.
	val := source @env0:dynamicInstVarAt: sym.
	val @env0:== nil ifFalse: [
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
setdefault: key _: default
	"Read through the FULL chain (a dict-slot or def binding counts as
	present); write, when absent, to the canonical dynamic-instVar home."

	| absent val |
	absent := Object @env0:new.
	val := source @env1:___globalAt___: key @env0:asSymbol otherwise: [absent].
	val @env0:== absent ifTrue: [
		source @env0:dynamicInstVarAt: key @env0:asSymbol put: default.
		^ default].
	^ val
%

set compile_env: 0
