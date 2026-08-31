! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'SelfNameCollisionTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
SelfNameCollisionTestCase comment:
'A def with no plain positional parameter must not inherit a self name
that collides with its OWN keyword-only / *vararg / **kwarg.

Grail compiles a class-body def by stripping its FIRST declared parameter
and binding the Smalltalk receiver to it, so body references to that name
become the receiver.  A def with no plain positional has nothing to strip,
and ClassDefAst carried the CLASS-WIDE name (taken from the class''s other
methods) over for its body -- so when that name happened to be this def''s
own keyword-only, *vararg or **kwarg, every reference to the def''s own
parameter compiled to the RECEIVER:

    class C:
        def first(a, b): ...          "class-wide self name becomes ''a''"
        def m(*args, a=1): return a   "``a'' compiled to self"

``C().m(a=3)'' answered the C instance instead of 3.  A silently wrong
VALUE, not an error -- the worst way for this to fail, and invisible to
every arity and keyword check because the call itself was well formed.

FunctionDefAst >> ___bindsOwnParameterNamed___: answers the collision and
ClassDefAst then carries nothing, which is also what CPython has: the def
took no self, so nothing in its body maps to the receiver.  A named first
parameter is unaffected, and @staticmethod / @classmethod use other
generators.

Found while sweeping the argument-binding family after the *args receiver
fix.  Two members of that family remain open (docs/Issues.md): a
**kwargs-only or keyword-only-only method has no positional slot for the
receiver and should raise as CPython does, and a method''s arity messages
count without the receiver where CPython counts it.

See tests/python/self_name_collision.py (10 checks, CPython-validated
first).'
%

expectvalue /Class
doit
SelfNameCollisionTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
SelfNameCollisionTestCase removeAllMethods: 0.
SelfNameCollisionTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: SelfNameCollisionTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'self_name_collision' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/self_name_collision.py')
		name: 'self_name_collision'.
%

category: 'Grail-Helpers'
method: SelfNameCollisionTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: SelfNameCollisionTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: SelfNameCollisionTestCase
testACollidingParameterIsNotTheReceiver
	"The keyword-only case that motivated this -- passed value, default,
	and alongside a *vararg that now carries the receiver as args[0] --
	plus a *vararg named like the self name."

	self assertAll: #('keyword_only_is_not_the_receiver'
		'keyword_only_default_is_not_the_receiver'
		'keyword_only_alongside_varargs' 'vararg_named_like_the_self_name')
%

category: 'Grail-Tests'
method: SelfNameCollisionTestCase
testTheOrdinarySpellingsAreUnchanged
	"A named first parameter is still the receiver, a NON-colliding
	keyword-only still binds from the call and from its default, and the
	method that set the class-wide name still works."

	self assertAll: #('named_first_parameter_is_still_the_receiver'
		'a_non_colliding_keyword_only_still_binds'
		'a_non_colliding_keyword_only_default'
		'the_first_method_itself_still_binds')
%

category: 'Grail-Tests'
method: SelfNameCollisionTestCase
testDecoratedFormsAreUnaffected
	"@staticmethod and @classmethod are compiled by other generators and
	must not change -- the boundary the guard sits beside."

	self assertAll: #('staticmethod_unaffected' 'classmethod_unaffected')
%
