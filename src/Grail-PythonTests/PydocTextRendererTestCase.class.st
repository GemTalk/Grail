Class {
	#name : 'PydocTextRendererTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
PydocTextRendererTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
PydocTextRendererTestCase >> setUp [
	"Reload tests/python/pydoc_text_renderer.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'pydoc_text_renderer' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/pydoc_text_renderer.py')
		name: 'pydoc_text_renderer'.

]

{ #category : 'Grail-Tests - Known gaps' }
PydocTextRendererTestCase >> testAModuleLevelFunctionHasNoDocstringWhichIsAKnownGap [
	"Recorded, NOT endorsed, and narrow: a CLASS docstring and a METHOD
	docstring both work, so this is specific to a def at module scope.  pydoc
	renders whatever docstring it is handed, so the effect is empty sections
	rather than a failure."

	self assert: (self resultAt: 'function_docstring') asString equals: 'None'.
	self assert: (self resultAt: 'class_docstring') asString
		equals: '''One line summary.'''.

]

{ #category : 'Grail-Tests - inspect' }
PydocTextRendererTestCase >> testGetclasstreeNestsChildrenUnderTheirBase [
	self assert: (self resultAt: 'getclasstree_nesting') asString
		equals: '[''_A'', [''_B'']]'.

]

{ #category : 'Grail-Tests - Rendering' }
PydocTextRendererTestCase >> testHelperRendersCPythonsHeading [
	"help()'s first line, and it is not free: it is built from
	inspect.getmodule(), which was a stub answering None -- so the ``in module
	...'' half simply vanished."

	self assert: (self resultAt: 'help_first_line') asString
		equals: '''Help on class Color in module pydoc_text_renderer:'''.

]

{ #category : 'Grail-Tests - inspect' }
PydocTextRendererTestCase >> testIsmoduleAnswersTrueAboutAModule [
	"The one whose absence stopped pydoc on its first call -- and it needed
	types.ModuleType to name Grail's real module base class, not an inert stub.
	Every module in the system used to answer False here."

	self assert: (self resultAt: 'ismodule') asString equals: '[True, False]'.
	self assert: (self resultAt: 'getmodule_of_a_module') asString equals: '''pydoc'''.
	self assert: (self resultAt: 'getmodule_of_a_class') asString
		equals: '''pydoc_text_renderer'''.

]

{ #category : 'Grail-Tests - Attribute access' }
PydocTextRendererTestCase >> testObjectGetattributeReadsAndRaisesCatchably [
	"Both halves matter.  It has to ANSWER, and its miss has to be an
	AttributeError Python can catch -- the raw Smalltalk error it used to signal
	could not be caught at all, which is what made pydoc's try/except useless."

	self assert: (self resultAt: 'getattribute_reads') asString equals: '''sample'''.
	self assert: (self resultAt: 'getattribute_raises_catchably') asString
		equals: '''AttributeError'''.

]

{ #category : 'Grail-Tests - inspect' }
PydocTextRendererTestCase >> testSignatureCanFormatItself [
	"The method whose absence made docclass raise -- silently, because
	Doc.document swallows AttributeError, so the result was wrong OUTPUT rather
	than an error.  max_width is what pydoc passes, and the wrapping is the only
	behaviour it adds over str()."

	self assert: (self resultAt: 'signature_format') asString
		equals: '''(a, b=2, *args, c, **kw)'''.
	self assert: (self resultAt: 'signature_str_unchanged') asString
		equals: '''(a, b=2, *args, c, **kw)'''.
	self assert: (self resultAt: 'signature_format_wraps') asString equals: 'True'.

]

{ #category : 'Grail-Tests - inspect' }
PydocTextRendererTestCase >> testTheMissingInspectPredicatesExist [
	self assert: (self resultAt: 'predicates_exist') asString
		equals: '[True, True, True, True, True, True, True, True, True, True, True, True]'.

]

{ #category : 'Grail-Tests - The module' }
PydocTextRendererTestCase >> testTheModuleLevelHelpersAnswerCPythonsValues [
	self assert: (self resultAt: 'describe') asString equals: '''class Color'''.
	self assert: (self resultAt: 'splitdoc') asString
		equals: '(''One line.'', ''Rest of it.'')'.
	self assert: (self resultAt: 'classname_same_module') asString equals: '''int'''.
	self assert: (self resultAt: 'classname_other_module') asString
		equals: '''builtins.int'''.
	self assert: (self resultAt: 'plain_passes_text_through') asString
		equals: '''unstyled'''.
	self assert: (self resultAt: 'getdoc_first_line') asString
		equals: '''One line summary.'''.

]

{ #category : 'Grail-Tests' }
PydocTextRendererTestCase >> testTheMroNamesOnlyClassesCPythonAlsoNames [
	"PythonInstance has no CPython counterpart and must not appear in a
	Python-visible __mro__ -- the same reasoning that took Grail's plumbing out
	of object.__dict__.  It also answers no __module__, which is what made this
	a pydoc bug rather than a cosmetic one: docclass walks the mro calling
	classname(base, ...), the AttributeError was swallowed by Doc.document, and
	every class fell back to being described as a plain value.

	Three assertions because the leak had three faces, and one fix closed all
	of them: the mro itself, getclasstree's ROOT (built purely from __bases__),
	and whether docclass renders a class BODY at all."

	self assert: (self resultAt: 'mro_of_an_enum') asString
		equals: '[''Color'', ''Enum'', ''object'']'.
	self assert: (self resultAt: 'getclasstree_root') asString
		equals: '''object'''.
	self assert: (self resultAt: 'class_body_is_rendered') asString equals: 'True'.

]

{ #category : 'Grail-Tests - The module' }
PydocTextRendererTestCase >> testThePublicApiIsAllThere [
	"Sixteen names, because the stub had three of them.  A test that only
	checked Helper would pass against a second stub."

	self assert: (self resultAt: 'has_public_api') asString
		equals: '[True, True, True, True, True, True, True, True, True, True, True, True, True, True, True, True]'.
	self assert: (self resultAt: 'helper_is_a_class') asString equals: 'True'.
	self assert: (self resultAt: 'text_is_a_textdoc') asString equals: 'True'.

]

{ #category : 'Grail-Tests - The module' }
PydocTextRendererTestCase >> testVisiblenameKeepsCPythonsMixedReturnTypes [
	"1 and 0, not True and False: visiblename answers a bool for the general
	rules and a membership test's result for the dunder list.  Asserted as
	CPython returns them -- normalising would hide a change in which branch
	answered."

	self assert: (self resultAt: 'visiblename') asString equals: '[True, False, 1, 0]'.

]
