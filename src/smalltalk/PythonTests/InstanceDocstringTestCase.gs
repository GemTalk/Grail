! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for InstanceDocstringTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'InstanceDocstringTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
InstanceDocstringTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! InstanceDocstringTestCase
!
! CPython puts a ``__doc__'' entry in EVERY class's __dict__ -- the docstring, or
! None when there is none -- so an instance's lookup stops at its own type and
! never reaches object's.  ``class Plain: pass'' gives ``Plain().__doc__ is
! None''.
!
! Grail's ``object'' IS the kernel Object, so ``object >> __doc__'' sits at the
! root of everything and used to answer object's own docstring unconditionally.
! Every instance in the system claimed to be documented as ``The base class of
! the class hierarchy'', and inspect.getdoc -- whose entire job is to find the
! nearest REAL docstring -- could never answer None.  pydoc printed those four
! lines under each member of an enum.
!
! CLASSES were already right, and that is why the fix is narrow: ClassDefAst
! emits a class-side __doc__ accessor on every Python class, so ``Plain.__doc__''
! answered None all along.  A class RECEIVER deliberately keeps the old answer
! here, and not as a shortcut -- metaclass chains bottom out at Object, so a
! class DOES respond to this instance-side method, and asking ``self class''
! about its __doc__ would come straight back with the metaclass as receiver,
! forever.  What that leaves is a kernel-backed class answering object's
! docstring where CPython answers its own (``str.__doc__''), which is
! pre-existing behaviour and unchanged.
!
! THE OTHER HALF of this fixture is the second way a docstring lookup went wrong.
! Reading metadata off an unbound method (``Cls.m.__module__'') answered
! Smalltalk NIL when it could not find a string, on the reasoning that
! functools.wraps would then skip the name.  It does not skip: nil is not an
! AttributeError, so getattr handed it straight back and an object with no Python
! meaning at all escaped into Python code.  pydoc's parentname does
! ``object.__module__ + '.' + name'' and received it, raising ``UnboundLocalError:
! local variable referenced before assignment'' from inside docroutine -- naming
! neither the attribute nor the class.  Two changes fixed it: unwrapping the
! Smalltalk metaclass to the class Python would name (so an answer EXISTS for the
! common case), and making the last resort a best-effort string, as the sibling
! BoundMethod >> ___moduleOfClass___: has always done.
!
! Source fixture: tests/python/instance_docstring.py
! ===============================================================================

doit
InstanceDocstringTestCase comment:
'Tests that an instance''s __doc__ is its class''s docstring -- None when the
class has none -- and that unbound-method metadata (__module__, __qualname__) is
always a Python string rather than Smalltalk nil.  Drives
tests/python/instance_docstring.py.'
%

doit
InstanceDocstringTestCase removeAllMethods.
InstanceDocstringTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: InstanceDocstringTestCase
setUp
	"Reload tests/python/instance_docstring.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'instance_docstring' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/instance_docstring.py')
		name: 'instance_docstring'.
%

category: 'Grail-Private'
method: InstanceDocstringTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - Instance __doc__'
method: InstanceDocstringTestCase
testAnUndocumentedClassGivesItsInstancesNoDocstring
	"The whole bug in one line: the class was already right, the instance was
	not."

	self assert: (self resultAt: 'plain_class') asString equals: 'None'.
	self assert: (self resultAt: 'plain_instance') asString equals: 'None'.
%

category: 'Grail-Tests - Instance __doc__'
method: InstanceDocstringTestCase
testADocumentedClassGivesItsInstancesItsOwnDocstring
	"The read has to reach the class's docstring, not merely stop reaching
	object's -- an implementation that answered None unconditionally would pass
	the test above and fail this one."

	self assert: (self resultAt: 'documented_class') asString
		equals: '''One line summary.'''.
	self assert: (self resultAt: 'documented_instance') asString
		equals: '''One line summary.'''.
%

category: 'Grail-Tests - Instance __doc__'
method: InstanceDocstringTestCase
testASubclassDoesNotInheritItsBasesDocstring
	"CPython gives Sub its own __dict__ entry of None, so neither the class nor
	its instances borrow Documented's text."

	self assert: (self resultAt: 'sub_class') asString equals: 'None'.
	self assert: (self resultAt: 'sub_instance') asString equals: 'None'.
%

category: 'Grail-Tests - Instance __doc__'
method: InstanceDocstringTestCase
testGetdocCanFinallyAnswerNone
	"inspect.getdoc is the consumer that could not work at all: it exists to
	report ``no docstring here'', and every object answered object's."

	self assert: (self resultAt: 'getdoc_undocumented') asString equals: 'None'.
	self assert: (self resultAt: 'getdoc_documented') asString
		equals: '''One line summary.'''.
	self assert: (self resultAt: 'enum_member') asString equals: 'None'.
	self assert: (self resultAt: 'method') asString equals: '''Method docstring.'''.
%

category: 'Grail-Tests - Instance __doc__'
method: InstanceDocstringTestCase
testObjectKeepsItsOwnDocstring
	"The fix is about where the lookup STOPS, not about removing the text."

	self assert: (self resultAt: 'object_still_documented') asString
		equals: '''The base class of the class hierarchy.'''.
%

category: 'Grail-Tests - Unbound-method metadata'
method: InstanceDocstringTestCase
testUnboundMethodMetadataIsAlwaysAPythonValue
	"Phrased as ``is it a string'' rather than pinned to exact text, because the
	values legitimately differ between Grail and CPython -- what must not differ
	is that they are Python values at all.  A Smalltalk metaclass is spelled
	``Color class'', two words, so the space check catches it leaking into a
	qualified name without asserting which class Grail reports."

	self assert: (self resultAt: 'unbound_module_is_str') asString equals: 'True'.
	self assert: (self resultAt: 'unbound_qualname_is_str') asString equals: 'True'.
	self assert: (self resultAt: 'unbound_qualname_is_a_name') asString equals: 'True'.
	self assert: (self resultAt: 'method_module_is_str') asString equals: 'True'.
	self assert: (self resultAt: 'method_qualname') asString equals: '''Meth.m'''.
%

set compile_env: 0
