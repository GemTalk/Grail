! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- ModuleSpec class (Python 'importlib.machinery.ModuleSpec')
expectvalue /Class
doit
object subclass: 'ModuleSpec'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
ModuleSpec comment:
'PEP 451 module spec -- what ``mod.__spec__`` answers.

THE CANONICAL RECORD, not a summary.  CPython''s import machinery builds a spec
first and DERIVES the module''s other machinery attributes from it
(``_init_module_attrs``): ``__file__`` is ``spec.origin``, ``__loader__`` is
``spec.loader``, ``__package__`` is ``spec.parent``, ``__path__`` is
``spec.submodule_search_locations``.  Grail now does the same, through
importlib class >> ___initModuleAttrsFrom___:on:, so the two cannot drift.  That
drift is a real failure mode and CPython warns about it -- ``__package__ !=
__spec__.parent`` raises a DeprecationWarning there.

IN SMALLTALK, NOT IN importlib/__init__.py, and the reason is bootstrap order.
The import machinery needs a spec for EVERY module it makes, including the ones
that load before any .py has run; a class defined in a .py module cannot be
constructed by the machinery that imports it.  The .py facade now aliases this
class rather than defining its own, so ``from importlib.machinery import
ModuleSpec`` and the machinery''s own specs are ONE type and isinstance holds.

Fields are dynamic instVars named exactly as the Python attributes, so a read
resolves straight through ___pyAttrLoad___''s dynamic-instVar probe -- no
accessor and no ___pythonValueAttrs___ entry (the same mechanism as PyCode and
slice).

``cached`` IS ALWAYS None, deliberately.  It names the compiled BYTECODE file,
and Grail compiles to Smalltalk methods and writes no .pyc.  That is the same
decision recorded on module >> __cached__, and the two are load-bearing
together: _init_module_attrs sets ``__cached__`` only ``if spec.cached is not
None``, so a None here is exactly what keeps the attribute absent.
'
%

expectvalue /Class
doit
ModuleSpec category: 'Grail-Modules'
%

! ------------------- Remove existing methods from ModuleSpec
expectvalue /Metaclass3
doit
ModuleSpec removeAllMethods.
ModuleSpec class removeAllMethods.
ModuleSpec removeAllMethods: 1.
ModuleSpec class removeAllMethods: 1.
%

set compile_env: 0

category: 'Instance Creation'
classmethod: ModuleSpec
name: aName loader: aLoader origin: anOrigin submoduleSearchLocations: locsOrNil
	"Build a spec.  ``locsOrNil'' is nil (or Python None) for a non-package and
	a collection of directory strings for a package -- that single field is what
	decides ``parent'', ``__path__'' and package-ness downstream, exactly as in
	CPython.

	DERIVED FIELDS ARE COMPUTED ONCE, HERE, rather than left as CPython-style
	properties: Grail has no property protocol on a Smalltalk class that a
	Python attribute read would go through, and a stored value read through the
	dynamic-instVar probe is both simpler and the shape PyCode already uses.
	The cost is that mutating ``origin'' after construction does not recompute
	``has_location''; nothing in Grail mutates a spec after it is built."

	| inst none isPkg parent |
	none := System myUserProfile symbolList objectNamed: #'None'.
	inst := self new.
	isPkg := locsOrNil notNil and: [locsOrNil ~~ none].
	"``parent'' is the package a module lives in: its OWN name when it is a
	package, otherwise the name with the last dotted component removed, and ''
	for a top-level module.  This is what __package__ is set from."
	parent := isPkg
		ifTrue: [aName]
		ifFalse: [ | parts |
			parts := $. split: aName asString.
			parts size < 2
				ifTrue: ['']
				ifFalse: ['.' join: (parts copyFrom: 1 to: parts size - 1)]].
	inst dynamicInstVarAt: #'name' put: aName.
	inst dynamicInstVarAt: #'loader' put: (aLoader isNil ifTrue: [none] ifFalse: [aLoader]).
	inst dynamicInstVarAt: #'origin' put: (anOrigin isNil ifTrue: [none] ifFalse: [anOrigin]).
	inst dynamicInstVarAt: #'submodule_search_locations'
		put: (isPkg ifTrue: [locsOrNil] ifFalse: [none]).
	inst dynamicInstVarAt: #'parent' put: parent.
	"``has_location'' is CPython's ``the origin names a real place you could
	read this module from''.  A namespace package has origin None and
	has_location False, and _init_module_attrs keys the __file__ assignment off
	exactly this -- so a false here is what correctly leaves __file__ unset."
	inst dynamicInstVarAt: #'has_location'
		"``~='' and not ``~~'': the sentinel is a STRING, and two equal string
		literals are not the same object, so an identity test never matched and
		every built-in spec reported has_location true -- which would in turn
		have given every Smalltalk module a __file__ of 'built-in'."
		put: ((anOrigin notNil and: [anOrigin ~~ none]) and: [anOrigin ~= 'built-in']).
	"Always None -- see the class comment.  Grail writes no bytecode, and
	_init_module_attrs sets __cached__ only when this is not None, so this is
	what keeps module.__cached__ absent."
	inst dynamicInstVarAt: #'cached' put: none.
	"PEP 451's loader_state: a slot the loader may use for its own bookkeeping.
	None here; carried so third-party code that reads it finds the attribute
	rather than an AttributeError."
	inst dynamicInstVarAt: #'loader_state' put: none.
	^ inst
%

category: 'Instance Creation'
classmethod: ModuleSpec
name: aName loader: aLoader origin: anOrigin
	"A non-package spec."

	^ self name: aName loader: aLoader origin: anOrigin submoduleSearchLocations: nil
%

set compile_env: 1

category: 'Python-Initialization'
classmethod: ModuleSpec
__new__: aName _: aLoader
	"``ModuleSpec(name, loader)'' -- CPython's signature, whose origin and
	submodule_search_locations are keyword-only with None defaults."

	^ self @env0:name: aName loader: aLoader origin: nil submoduleSearchLocations: nil
%

category: 'Python-Initialization'
classmethod: ModuleSpec
__new__: aName _: aLoader _: anOrigin
	"``ModuleSpec(name, loader, origin)''.  Origin is keyword-only in CPython
	(``origin=''), but Grail dispatches a class call by ARITY, so the positional
	form has to exist for the facade in importlib/__init__.py -- which called it
	positionally before this class existed."

	^ self @env0:name: aName loader: aLoader origin: anOrigin submoduleSearchLocations: nil
%

category: 'Python-Initialization'
classmethod: ModuleSpec
__new__: aName _: aLoader _: anOrigin _: locs
	"``ModuleSpec(name, loader, origin, submodule_search_locations)''."

	^ self @env0:name: aName loader: aLoader origin: anOrigin submoduleSearchLocations: locs
%


category: 'Grail-Python Protocol'
method: ModuleSpec
__repr__
	"CPython prints ``ModuleSpec(name='json', loader=..., origin='/path')'',
	and pydoc / test output reads it.  Omits the fields CPython omits when they
	are empty, so the common case is the short form."

	| out nm org |
	nm := self @env0:dynamicInstVarAt: #'name'.
	org := self @env0:dynamicInstVarAt: #'origin'.
	out := WriteStream @env0:on: String @env0:new.
	out @env0:nextPutAll: 'ModuleSpec(name='.
	out @env0:nextPutAll: nm @env0:printString.
	out @env0:nextPutAll: ', loader='.
	out @env0:nextPutAll: (self @env0:dynamicInstVarAt: #'loader') @env0:printString.
	"EVERY SEND HERE IS ENV-QUALIFIED, and the three that were not made this
	method die rather than answer.  It is compiled in env 1, where
	``System myUserProfile'' is a MessageNotUnderstood sent to a Metaclass3 --
	and one Python code cannot catch, so repr() of any spec carrying an origin
	took the process down.  Every module Grail imports from a file has an
	origin, so this was every spec but the built-in ones."
	(org @env0:isNil @env0:or: [
		org @env0:== (System @env0:myUserProfile @env0:symbolList
			@env0:objectNamed: #'None')])
		@env0:ifFalse: [
			out @env0:nextPutAll: ', origin='.
			out @env0:nextPutAll: org @env0:printString].
	out @env0:nextPutAll: ')'.
	^ out @env0:contents
%
