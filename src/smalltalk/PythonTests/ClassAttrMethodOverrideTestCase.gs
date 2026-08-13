! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ClassAttrMethodOverrideTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassAttrMethodOverrideTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassAttrMethodOverrideTestCase - a class-body assignment binding a callable
! overrides an inherited method, self-sends included.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassAttrMethodOverrideTestCase removeAllMethods.
ClassAttrMethodOverrideTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - class attributes'
method: ClassAttrMethodOverrideTestCase
testClassAttrOverridesInheritedMethod
	"``m = OtherClass.m'' in a class body must override an inherited ``m'',
	whichever way the call is spelled.

	Grail compiles ``self.m()'' inside a class that defines ``m'' to a direct
	Smalltalk send (CallAst classSelfSendSelector), resolved virtually.  An
	assignment compiles NO method -- it stores into the class ATTRIBUTE store --
	so a subclass that wrote ``m = Other.m'' left the BASE's compiled ``m'' as
	the nearest implementation, and the base's own self-send ran that one.
	Meanwhile ``sub.m()'' went through ___pyAttrLoad___, which consults the
	attribute store first and correctly ran the assigned function: two
	spellings of one call disagreed.

	unittest.TestCase >> run calls ``self.setUp()'' exactly that way, so
	test.test_set's TestSetSubclassWithSlots -- whose whole body is
	``setUp = TestJointOps.setUp'' plus ``test_pickling = ...'' -- never ran
	its setUp, and both it and the frozenset subclass that inherits from it
	died on a missing ``self.s''.

	Object class >> ___grailInstallAttrMethodShadows___: closes it at
	class-creation time: for each assigned name the superclass chain
	implements as a compiled method, and whose value binds self, it compiles a
	forwarding method that re-routes through the attribute load.  A
	non-callable value of the same name gets none -- ``greet = 'a string'''
	stays a data attribute."

	| mod results |
	importlib @env1:modules removeKey: #'class_attr_method_override' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_attr_method_override.py')
		name: 'class_attr_method_override'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#(#('attr_greet' 'donor') #('self_greet' 'donor')
	  #('base_greet' 'base') #('own_def_wins' 'own def')
	  #('inherited_shadow' 'donor') #('data_attr' 'just a string')
	  #('borrowed_setup' 'ok') #('borrowed_setup_inherited' 'ok'))
		do: [:pair |
			self
				assert: ((results @env1:__getitem__: (pair at: 1)) = (pair at: 2))
				description: (pair at: 1) , ' was ' ,
					(results @env1:__getitem__: (pair at: 1)) printString].
	"Fixed-arity and varargs forwarders both carry their arguments through."
	#('attr_add' 'self_add') do: [:key |
		| t |
		t := results @env1:__getitem__: key.
		self assert: ((t @env1:__getitem__: 0) = 'donor') description: key.
		self assert: ((t @env1:__getitem__: 1) = 1) description: key.
		self assert: ((t @env1:__getitem__: 2) = 2) description: key].
	#('attr_flex' 'self_flex') do: [:key |
		| t |
		t := results @env1:__getitem__: key.
		self assert: ((t @env1:__getitem__: 0) = 'donor') description: key.
		self assert: (((t @env1:__getitem__: 1) @env1:__getitem__: 0) = 1)
			description: key.
		self assert: (((t @env1:__getitem__: 2) @env1:__getitem__: 0) = 'k')
			description: key]
%
