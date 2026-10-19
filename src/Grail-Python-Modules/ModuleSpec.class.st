"PEP 451 module spec -- what ``mod.__spec__`` answers.

THE CANONICAL RECORD, not a summary.  CPython's import machinery builds a spec
first and DERIVES the module's other machinery attributes from it
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
ModuleSpec`` and the machinery's own specs are ONE type and isinstance holds.

Fields are dynamic instVars named exactly as the Python attributes, so a read
resolves straight through ___pyAttrLoad___'s dynamic-instVar probe -- no
accessor and no ___pythonValueAttrs___ entry (the same mechanism as PyCode and
slice).

``cached`` IS ALWAYS None, deliberately.  It names the compiled BYTECODE file,
and Grail compiles to Smalltalk methods and writes no .pyc.  That is the same
decision recorded on module >> __cached__, and the two are load-bearing
together: _init_module_attrs sets ``__cached__`` only ``if spec.cached is not
None``, so a None here is exactly what keeps the attribute absent.

"
Class {
	#name : 'ModuleSpec',
	#superclass : 'object',
	#category : 'Grail-Modules'
}

{ #category : 'Instance Creation' }
ModuleSpec class >> name: aName loader: aLoader origin: anOrigin [
	"A non-package spec."

	^ self name: aName loader: aLoader origin: anOrigin submoduleSearchLocations: nil

]

{ #category : 'Instance Creation' }
ModuleSpec class >> name: aName loader: aLoader origin: anOrigin submoduleSearchLocations: locsOrNil [
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

]
