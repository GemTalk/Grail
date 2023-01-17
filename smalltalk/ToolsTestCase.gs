! ------------------- Remove existing behavior from ToolsTestCase
removeAllMethods ToolsTestCase
removeAllClassMethods ToolsTestCase
! ------------------- Class methods for ToolsTestCase
set compile_env: 0
category: 'other'
classmethod: ToolsTestCase
filename

	^nil
%
! ------------------- Instance methods for ToolsTestCase
set compile_env: 0
category: 'other'
method: ToolsTestCase
testFunctionDefScopePositionalNamed

"
       FunctionDef(
            name='my_function',
            args=arguments(
                posonlyargs=[],
                args=[
                    arg(arg='a'),
                    arg(arg='b')],
                vararg=arg(arg='args'),
                kwonlyargs=[
                    arg(arg='c')],
                kw_defaults=[
                    Constant(value=3)],
                kwarg=arg(arg='kargs'),
                defaults=[
                    Constant(value=2)]),
            body=[
                Pass()],
            decorator_list=[]),
"

	| scope function |
	scope := Variables new.
	function := FunctionDef new
						args: { #a. #b };
						vararg: #vararg;
						kwonlyargs: { #c };
						kw_defaults: { int ___value: 3 };
						kwarg: #kwarg;
						defaults: { int ___value: 2 };
						yourself.

	function block: [ :currentScope |
		self 
			assert: (currentScope at: #a) equals: (int ___value: 1);
			assert: (currentScope at: #b) equals: (int ___value: 2);
			assert: (currentScope at: #c) equals: (int ___value: 3);
			assert: (currentScope at: #vararg) ___value size equals: 3;
			assert: ((currentScope at: #vararg) ___value includes: (int ___value: 4)) equals: true;
			assert: ((currentScope at: #vararg)  ___value includes: (int ___value: 5)) equals: true;
			assert: ((currentScope at: #vararg)  ___value includes: (int ___value: 6)) equals: true;
			assert: ((currentScope at: #kwarg) __getitem__: (str ___value: 'd')) equals: (int ___value: 7);
			assert: ((currentScope at: #kwarg) __getitem__: (str ___value: 'e')) equals: (int ___value: 8);
			assert: ((currentScope at: #kwarg) __getitem__: (str ___value: 'f')) equals: (int ___value: 9);
			yourself.
	^2.
	].

	self assert: (function 
		scope: scope 
		positional: { int ___value: 1. int ___value: 2. int ___value: 4. int ___value: 5. int ___value: 6. } 
		named: {
			#d -> (int ___value: 7).
			#e -> (int ___value: 8).
			#f -> (int ___value: 9).
		}) equals: 2.
%
category: 'other'
method: ToolsTestCase
testVariableHelperAt
	"test that the variable helper object method for reading reads properly"

	(AllVariables last) at:#'testVar1' put: 1.

	self assert: (accessVariable at: #'testVar1' withHelperSymbols: (IdentitySet new)) equals: 1.

	(AllVariables at: 2) at:#'testVar2' put: 2.

	self assert: (accessVariable at: #'testVar2' withHelperSymbols: (IdentitySet new)) equals: 2.
%
category: 'other'
method: ToolsTestCase
testVariableHelperAtPut
	"test that the variable helper object method for writting reads properly"

	accessVariable at: #'testVar' put: 2.

	self assert: (AllVariables last at: #'testVar') equals: 2.
%
category: 'other'
method: ToolsTestCase
testVariablesNew

	| myScope |
	myScope := Variables new.
	self assert: (myScope at: #print) notNil.
%
