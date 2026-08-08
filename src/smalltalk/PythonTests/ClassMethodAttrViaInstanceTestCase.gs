! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassMethodAttrViaInstanceTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassMethodAttrViaInstanceTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassMethodAttrViaInstanceTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassMethodAttrViaInstanceTestCase - reading a @classmethod off an instance
! ===============================================================================
! Guards the class-side probe in object>>___pyAttrLoad___.  Complements
! ClassMethodViaInstanceTestCase, which covers the direct-SEND shapes that
! reach PythonInstance>>doesNotUnderstand:; this covers the LOAD shapes,
! which never reach a send at all.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassMethodAttrViaInstanceTestCase removeAllMethods.
ClassMethodAttrViaInstanceTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - classmethod'
method: ClassMethodAttrViaInstanceTestCase
testClassMethodReadableThroughInstance
	"``p.cm()'' where cm is a @classmethod must bind the CLASS and work,
	at every arity and through every load shape.

	The def lives on the METACLASS (category 'Grail-Class Methods'), so
	none of ___pyAttrLoad___'s instance-side probes could see it.
	PythonInstance>>doesNotUnderstand: forwards the direct-SEND shape,
	but its branch is guarded by ``s last = $:'' -- KEYWORD selectors
	only -- so a ZERO-ARG classmethod had no route at all, and the pure
	LOAD shapes (getattr, or binding the method to a name) had none at
	any arity:

	    p.cm1(7)             worked   (keyword selector -> DNU forward)
	    p.cm0()              AttributeError
	    getattr(p, 'cm0')()  AttributeError
	    f := p.cm0. f()      AttributeError

	The probe answers what the CLASS's own load answers, rather than
	wrapping the raw selector, so a decorator stacked under @classmethod
	is applied rather than bypassed.

	Also pinned: cls binds to the RECEIVER's class (a subclass instance
	must see the subclass), and a genuinely missing attribute still
	raises AttributeError -- the probe must not swallow real misses."

	| mod results |
	importlib @env1:modules removeKey: #'classmethod_attr_via_instance' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/classmethod_attr_via_instance.py')
		name: 'classmethod_attr_via_instance'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#('zero_arg_via_class' 'zero_arg_via_instance' 'zero_arg_via_getattr'
	  'zero_arg_bound_then_called' 'one_arg_via_instance'
	  'two_arg_via_instance' 'subclass_binds_subclass'
	  'subclass_via_getattr' 'missing_still_raises') do: [:key |
		self assert: ((results @env1:__getitem__: key) = true) description: key]
%
