! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'PosonlySyntaxAndArityTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
PosonlySyntaxAndArityTestCase comment:
'Parameter-list placement rules, and the arity message''s keyword-only tail.

The parser accepted every misplacement of ``/'' (after * in any form,
after **kwargs, first, alone, twice) and a bare positional parameter
after a defaulted one.  The refusals now sit in
parseFunctionParametersUntil: beside the duplicate-name and bare-*
checks, one path serving def / async def / lambda, with CPython''s
messages and precedence -- the after-**kwargs rule being the GENERAL
``arguments cannot follow var-keyword argument''.

The arity half extends FunctionDefAst''s too-many-positional guard with
CPython''s parenthetical -- ``takes 3 positional arguments but 6
positional arguments (and 2 keyword-only arguments) were given'' --
counting at runtime the kw keys that name keyword-only parameters, and
emitting the richer guard ONLY for defs with a keyword-only section so
every other def keeps its historical byte-identical emission.  Took
test_positional_only_arg from ERROR/5 to 1, the survivor being the
bytecode-introspection platform gap (docs/Issues.md).

See tests/python/posonly_syntax_and_arity.py (28 checks,
CPython-validated first).'
%

expectvalue /Class
doit
PosonlySyntaxAndArityTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
PosonlySyntaxAndArityTestCase removeAllMethods: 0.
PosonlySyntaxAndArityTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: PosonlySyntaxAndArityTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'posonly_syntax_and_arity' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/posonly_syntax_and_arity.py')
		name: 'posonly_syntax_and_arity'.
%

category: 'Grail-Helpers'
method: PosonlySyntaxAndArityTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: PosonlySyntaxAndArityTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: PosonlySyntaxAndArityTestCase
testTheSlashPlacementFamily
	"After * in any form, after **kwargs (the general rule), twice, first,
	alone -- for def, async def and lambda through the one parser path."

	self assertAll: #('slash_after_star_args' 'slash_after_bare_star'
		'slash_in_kwonly_section' 'slash_after_kwargs' 'param_after_kwargs'
		'slash_twice' 'slash_twice_with_tail' 'slash_first' 'slash_alone'
		'async_slash_after_star' 'lambda_slash_alone' 'lambda_slash_after_star')
%

category: 'Grail-Tests'
method: PosonlySyntaxAndArityTestCase
testDefaultOrderingAndDuplicates
	"A bare positional parameter after a defaulted one -- the slash not
	resetting the rule -- plus the pre-existing duplicate refusals pinned
	with the family."

	self assertAll: #('default_then_bare' 'default_then_bare_across_slash'
		'default_before_slash_bare_after' 'async_default_ordering'
		'lambda_default_ordering' 'duplicate_across_slash'
		'duplicate_into_kwonly')
%

category: 'Grail-Tests'
method: PosonlySyntaxAndArityTestCase
testWhatStaysLegal
	"The star resets the default rule (bare keyword-only params are named
	at the call), and the full mixed signature still parses."

	self assertAll: #('kwonly_bare_after_defaults' 'star_args_after_defaults'
		'kwargs_after_defaults' 'posonly_defaults_matched' 'full_signature')
%

category: 'Grail-Tests'
method: PosonlySyntaxAndArityTestCase
testTheArityParenthetical
	"Present exactly when keyword-only parameters were bound, each count
	pluralized on its own, plain defs byte-identical to before."

	self assertAll: #('arity_pos_and_kwonly' 'arity_singular_kwonly'
		'arity_no_kwonly_bound_stays_plain' 'arity_plain_def_untouched')
%
