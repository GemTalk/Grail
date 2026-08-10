! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyImportTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyImportTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyImportTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyImportTestCase
!
! ``import x'' inside a class body.
!
! CPython executes a class body as a namespace, so the import binds x there
! and x becomes a class attribute that later body statements can use.  Grail
! compiles a class body STRUCTURALLY -- ClassDefAst >> classBodyAttributes
! scans it for name bindings -- and that scan recognised only AssignAst /
! AnnAssignAst.  An import was therefore dropped whole: the name never bound,
! and any later reference to it raised NameError.
!
! It hid for a long time because a bare stdlib module name resolved as a
! global regardless, so the class body appeared to work while the import
! statement did nothing at all.  It surfaced only when bare-name resolution
! was narrowed towards real builtins, at which point werkzeug's
! EnvironBuilder -- ``import json'' / ``json_dumps = staticmethod(json.dumps)''
! / ``del json'' -- stopped importing.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyImportTestCase removeAllMethods.
ClassBodyImportTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassBodyImportTestCase
setUp
	"Reload tests/python/class_body_import.py fresh each test; the classes
	are built once at import, so each assertion reads that construction."

	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_import' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_import.py')
		name: 'class_body_import'.
	probe := testModule @env1:probe.
%

category: 'Grail-Private'
method: ClassBodyImportTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

category: 'Grail-Tests'
method: ClassBodyImportTestCase
testImportBindsAsClassAttribute
	"``class C: import json'' leaves json on the class."

	self assert: (self at: 'on_class').
	self assert: (self at: 'plain_is_module').
%

category: 'Grail-Tests'
method: ClassBodyImportTestCase
testImportedNameUsableLaterInTheBody
	"The failing half: a later class-body statement must see the name.
	Before the fix this raised NameError."

	self assert: (self at: 'used_later') @env0:asString equals: '{"k": 2}'.
%

category: 'Grail-Tests'
method: ClassBodyImportTestCase
testDottedImportBindings
	"``import a.b as x'' binds the LEAF; ``import a.b'' binds the TOP-level
	package -- the same split the module-scope import already honours."

	self assert: (self at: 'dotted_alias') @env0:asString equals: 'a/b'.
	self assert: (self at: 'dotted_no_alias') @env0:asString equals: '/'.
%

category: 'Grail-Tests'
method: ClassBodyImportTestCase
testWerkzeugEnvironBuilderIdiom
	"The upstream shape that motivated the fix, verbatim: import, capture
	an attribute into a staticmethod, then del the module name."

	self assert: (self at: 'werkzeug_dumps') @env0:asString equals: '{"a": 1}'.
%

category: 'Grail-Tests'
method: ClassBodyImportTestCase
testMultipleImportsOnOneStatement
	"``import json, math'' binds both."

	self assert: (self at: 'multiple_json') @env0:asString equals: '[1]'.
	self assert: (self at: 'multiple_math') equals: 2.
%

category: 'Grail-Tests - from import'
method: ClassBodyImportTestCase
testFromImportBindsAsClassAttribute
	"``from os import sep'' binds sep in the class namespace, and a later
	body statement must see it -- the same contract as a plain import.
	ImportFromAst was the last binding form that did not announce itself,
	so the statement was dropped whole and ``sep'' raised NameError."

	self assert: (self at: 'from_combined') @env0:asString equals: 'x/'.
	self assert: (self at: 'from_on_class') @env0:asString equals: '/'.
%

category: 'Grail-Tests - from import'
method: ClassBodyImportTestCase
testFromImportAliasBindsOnlyTheAlias
	"``from math import floor as fl'' binds fl, NOT floor."

	self assert: (self at: 'from_aliased') equals: 2.
	self deny: (self at: 'from_alias_not_original').
%

category: 'Grail-Tests - from import'
method: ClassBodyImportTestCase
testFromImportMultipleNames
	"``from math import floor, ceil'' binds both."

	self assert: (self at: 'from_multi_floor') equals: 2.
	self assert: (self at: 'from_multi_ceil') equals: 3.
%
