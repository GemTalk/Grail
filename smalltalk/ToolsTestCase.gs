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
			assert: (currentScope at: #vararg) size equals: 3;
			assert: ((currentScope at: #vararg) includes: (int ___value: 4)) equals: true;
			assert: ((currentScope at: #vararg) includes: (int ___value: 5)) equals: true;
			assert: ((currentScope at: #vararg) includes: (int ___value: 6)) equals: true;
			assert: ((currentScope at: #kwarg) at: #d) equals: (int ___value: 7);
			assert: ((currentScope at: #kwarg) at: #e) equals: (int ___value: 8);
			assert: ((currentScope at: #kwarg) at: #f) equals: (int ___value: 9);
			yourself.
	].

	function 
		scope: scope 
		positional: { int ___value: 1. int ___value: 2. int ___value: 4. int ___value: 5. int ___value: 6. } 
		named: {
			#d -> (int ___value: 7).
			#e -> (int ___value: 8).
			#f -> (int ___value: 9).
		}.
%
category: 'other'
method: ToolsTestCase
testVariablesNew

	| myScope |
	myScope := Variables new.
	self assert: (myScope at: #print) notNil.
%
