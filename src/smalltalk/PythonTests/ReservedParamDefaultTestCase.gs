! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ReservedParamDefaultTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ReservedParamDefaultTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ReservedParamDefaultTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ReservedParamDefaultTestCase - a reserved-named parameter that has a default
! ===============================================================================
! A Python parameter whose name is a Smalltalk pseudo-variable (self, super,
! nil, true, false, thisContext) is compiled into a renamed TRANSPORT temp
! ``_<name>'', because Smalltalk cannot declare those.  Two places got that
! rename wrong, and BOTH only fired when such a parameter had a DEFAULT -- which
! is why the family looked healthy for years:
!
!   1. The def-time temp holding the default was DECLARED from the Python name
!      and READ from the transport name -- ``___default_self___'' against
!      ``___default__self___''.  For every ordinary parameter those two strings
!      are identical, so the mismatch was invisible until a reserved name made
!      them differ, and then the whole enclosing method failed to compile.
!
!   2. The default EXPRESSION was resolved in the def's OWN scope instead of the
!      enclosing one.  A default is evaluated at def time, in the scope that
!      CONTAINS the def, so ``def h(y, self=self)'' must read the enclosing self;
!      resolving it inside h emitted h's own transport temp into the enclosing
!      method, where no such temp exists.
!
! WHAT MADE THE SECOND ONE FINDABLE is that fixing only the first turned a loud
! failure into a silent wrong answer for one shape and kept the other failing:
! ``self=self'' still would not compile, because its default is the one
! expression whose scope the bug mis-read.
!
! THE MEASUREMENT THAT PROMPTED THIS: CPython's own
! ElementTree.XMLParser._setevents uses ``self=self'' to carry the instance into
! its handlers.  It would not compile, so XMLPullParser.__init__ raised, so every
! use of iterparse was unreachable -- 30 of test.test_xml_etree's 64 failures,
! from one method.  After the fix that module's codegen-gap count is 1 (an
! unrelated multiple-inheritance shape) and 15 more of its tests pass.
!
! tests/python/reserved_param_default.py holds the 10 checks below and is run
! under real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ReservedParamDefaultTestCase removeAllMethods.
ReservedParamDefaultTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - reserved parameter names'
method: ReservedParamDefaultTestCase
testEveryReservedParamCheckAgreesWithCPython
	"Every check in tests/python/reserved_param_default.py, which the fixture
	gate also runs under CPython 3.14.

	The names are listed rather than iterated so that a check DISAPPEARING
	fails too -- a fixture that stopped defining checks would otherwise pass
	this test with an empty loop."

	| fixture results names |
	importlib @env1:modules removeKey: #'reserved_param_default' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/reserved_param_default.py')
		name: 'reserved_param_default'.
	results := fixture @env1:___pyAttrLoad___: #RESULTS.
	names := #('a_nested_reserved_param_needs_no_default'
	  'a_nested_reserved_param_takes_its_default'
	  'a_nested_reserved_param_yields_to_an_argument'
	  'a_reserved_name_binds_its_argument'
	  'a_reserved_name_takes_its_default'
	  'an_explicit_argument_beats_the_default'
	  'an_ordinary_parameter_is_unaffected'
	  'every_reserved_name_takes_its_default'
	  'self_equals_self_reads_an_enclosing_transport_temp'
	  'self_equals_self_reads_the_enclosing_receiver').
	names do: [:name |
		self
			assert: ((results @env1:__getitem__: name) = true)
			description: name , ' -> ' , (results @env1:__getitem__: name) printString].
	self assert: names size equals: 10
%

category: 'Grail-Tests - reserved parameter names'
method: ReservedParamDefaultTestCase
testTheElementTreeIdiomThatPromptedThisCompilesAndRuns
	"The shape from CPython's ElementTree.XMLParser._setevents, named on its own
	so the regression has somewhere to land that reads like the code that found
	it rather than like a reduction of it."

	self assert: (self eval:
'class Parser:
    def setevents(self, queue):
        def handler(text, append=queue.append, self=self):
            append((text, self.tag))
        return handler
    tag = ''root''
p = Parser()
seen = []
p.setevents(seen)(''hello'')
seen[0]
') equals: (self eval: '(''hello'', ''root'')')
%

category: 'Grail-Tests - reserved parameter names'
method: ReservedParamDefaultTestCase
testIterparseIsReachableAgain
	"iterparse is built on XMLPullParser, whose __init__ calls _setevents, so
	the whole pull-parsing half of ElementTree stood or fell with the compile
	above.  Asserted through read_events rather than through iteration, because
	iterating the result reaches a SEPARATE open defect -- a class attribute
	holding an already-bound method is re-bound on read (docs/Issues.md)."

	self assert: (self eval:
'import xml.etree.ElementTree as ElementTree
parser = ElementTree.XMLPullParser([''start'', ''end''])
parser.feed(''<a><b/></a>'')
'','' .join(event + '':'' + element.tag for event, element in parser.read_events())
') equals: 'start:a,start:b,end:b,end:a'
%
