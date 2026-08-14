! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'MethodShadowsClassAttrTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MethodShadowsClassAttrTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MethodShadowsClassAttrTestCase - a subclass def outranks a class attribute
! inherited from a base, the way one MRO walk settles it in CPython.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MethodShadowsClassAttrTestCase removeAllMethods.
MethodShadowsClassAttrTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - attributes'
method: MethodShadowsClassAttrTestCase
testMethodShadowsInheritedClassAttribute
	"CPython keeps a class's attributes and its functions in ONE __dict__ and
	lets the MRO settle the name: the nearer class wins, whichever KIND it
	supplies.  Grail splits them -- a class-body ``x = v'' becomes an accessor
	pair on the metaclass, a ``def x'' an instance method -- and every
	class-attribute probe ran before the method paths, so a BASE class's
	attribute beat a SUBCLASS's own def.  Where the inherited value was not
	callable the call became ``'Integer' object is not callable''.

	___classChainAttrLookup___: already applied this rule to the OTHER
	class-attribute store; the accessor-pair store had it nowhere.  Five probes
	read that store -- two in the PythonInstance branch, one for built-in
	subclasses, one class-side setter-paired read, and the built-in-subclass
	classmethod wrap -- and the rule has to hold at every one of them: gating
	some of them only moved the wrong answer to the next branch, which is how
	the same name came back first as an attribute, then as a BoundMethod bound
	to the CLASS, then as the attribute again.

	``upTo:'' EXCLUDES the class holding the attribute, so a class that both
	binds the name and defines the method keeps the binding -- the ordinary
	monkey-patch, and the reason SameClass below still answers 'REBOUND'.

	This is what left test.test_enumerate's TestStart and TestLongStart failing
	(12 tests): both exist precisely to override the base's ``enum'' with a
	method of their own."

	| mod results |
	importlib @env1:modules removeKey: #'method_shadows_class_attr' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/method_shadows_class_attr.py')
		name: 'method_shadows_class_attr'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#('instance_call_fixed_arity' 'instance_call_defaulted'
	  'instance_call_defaulted_explicit' 'read_via_base_method'
	  'class_side_read_is_callable' 'class_side_call'
	  'non_callable_attr_shadowed' 'base_keeps_its_attribute'
	  'base_class_keeps_its_attribute' 'base_number_unchanged'
	  'inherited_attr_without_method'
	  'inherited_attr_without_method_class' 'same_class_rebinding_wins'
	  'same_class_rebinding_wins_on_class' 'classmethod_via_instance'
	  'classmethod_via_class' 'staticmethod_via_instance'
	  'inherited_property_still_reads'
	  'method_inherited_from_middle_class' 'nearest_binding_wins_again') do: [:key |
		self assert: ((results @env1:__getitem__: key) = true) description: key]
%
