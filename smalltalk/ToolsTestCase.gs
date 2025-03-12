! ------------------- Remove existing behavior from ToolsTestCase
removeallmethods ToolsTestCase
removeallclassmethods ToolsTestCase
! ------------------- Class methods for ToolsTestCase
! ------------------- Instance methods for ToolsTestCase
category: 'other'
method: ToolsTestCase
testBuiltinsSingleton
	| g1 g2|

	g1 := PyGlobals new.
	g2 := PyGlobals new.
	self assert: g1 builtins == g2 builtins.
%
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
						params: { #a. #b };
						vararg: #vararg;
						kwonlyargs: { #c };
						kw_defaults: { int ___value: 3 };
						kwarg: #kwarg;
						defaults: { int ___value: 2 };
						yourself.

	function block: [:currentScope |
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
	^2
	].

	self assert: (function 
		scope: scope 
		positional: { int ___value: 1. int ___value: 2. int ___value: 4. int ___value: 5. int ___value: 6. } 
		named: {
			 (str ___value: 'd') -> (int ___value: 7).
			(str ___value: 'e') -> (int ___value: 8).
			 (str ___value: 'f') -> (int ___value: 9).
		}) equals: 2.
%
category: 'other'
method: ToolsTestCase
testSetAsGlobals

	| currScope localScope |
	currScope := PyGlobals new.
	localScope := currScope createChildScope.
	localScope setAsGlobals: #(x).
	localScope at: #x put: 1.

	self assert: (localScope at: #x) equals: 1.
	self assert: (currScope at: #x) equals: 1.

	currScope := PyGlobals new.
	localScope := currScope createChildScope.
	localScope at: #x put: 1.
	[localScope setAsGlobals: #(x)] on: SyntaxError do: [^self].
	self assert: false.
%
category: 'other'
method: ToolsTestCase
testSetAsNonlocals

	| currScope localScope nonlocalScope |
	currScope := PyGlobals new.
	localScope := currScope createChildScope.
	nonlocalScope := localScope createChildScope.
	currScope at: #x put: 1.
	localScope at: #x put: 1.
	nonlocalScope setAsNonlocals: #(x).
	nonlocalScope at: #x put: 2.
	
	self assert: (nonlocalScope at: #x) equals: 2.
	self assert: (localScope at: #x) equals: 2.
	self assert: (currScope at: #x) equals: 1.

	currScope := PyGlobals new.
	localScope := currScope createChildScope.
	nonlocalScope := localScope createChildScope.
	currScope at: #x put: 1.
	localScope at: #x put: 1.
	nonlocalScope at: #x put: 2.
	[nonlocalScope setAsNonlocals: #(x)] on: SyntaxError do: [^self].
	self assert: false.
%
category: 'other'
method: ToolsTestCase
testVariablesNew

	| myScope |
	myScope := Variables new.
	self assert: (myScope at: #print) notNil.
%
