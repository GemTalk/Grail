! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for FunctionDefAst
expectvalue /Class
doit
StatementAst subclass: 'FunctionDefAst'
  instVarNames: #( name args body
                    decorator_list returns type_comment type_params)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
FunctionDefAst comment: 
'FunctionDef(identifier name, arguments args,
                       stmt* body, expr* decorator_list, expr? returns,
                       string? type_comment)'
%

expectvalue /Class
doit
FunctionDefAst category: 'Parser'
%

! ------------------- Remove existing behavior from FunctionDefAst
removeallmethods FunctionDefAst
removeallclassmethods FunctionDefAst

set compile_env: 0

category: 'other'
method: FunctionDefAst
addVariableNamesTo: aStream

	aStream nextPutAll: name; space
%

category: 'other'
method: FunctionDefAst
decoratorList

	^decorator_list
%

category: 'other'
method: FunctionDefAst
name

	^name
%

category: 'other'
method: FunctionDefAst
printArgList: anArray on: aStream


	aStream nextPutAll: '{ '.
	anArray do: [:arg |
		aStream
			nextPut: $#;
			nextPutAll: arg name;
			nextPutAll: '. ';
			yourself.
	].
	aStream nextPut: $}.
%

category: 'other'
method: FunctionDefAst
printDefaultsList: anArray on: aStream


	aStream nextPutAll: '{ '.
	anArray do: [:arg |
		arg == None ifTrue: [
			aStream nextPutAll: 'None. '.
		] ifFalse: [
			arg printSmalltalkWithParenthesisOn: aStream.
			aStream
				nextPutAll: '. ';
				yourself.
		].
	].
	aStream nextPut: $}.
%

category: 'other'
method: FunctionDefAst
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $(;
		nextPutAll: name;
		nextPut: $);
		yourself.
%

category: 'other'
method: FunctionDefAst
printSmalltalkOn: aStream

	aStream
		nextPutAll: name;
		nextPutAll: ' := [:positional :keyword |';
		lf;
		increaseIndent.
	args args notEmpty ifTrue: [
		aStream nextPutAll: '| '.
		args args do: [:arg |
			aStream nextPutAll: arg name; space.
		].
		aStream nextPut: $|; lf.
		1 to: args args size do: [:i |
			| arg |
			arg := args args at: i.
			aStream
				nextPutAll: arg name;
				nextPutAll: ' := positional ___at___: ';
				print: i;
				nextPut: $.;
				lf.
		].
	].
	aStream
		nextPut: $[;
		lf;
		increaseIndent.
	body printSmalltalkOn: aStream.
	aStream
		decreaseIndent;
		nextPutAll: '] value.';
		lf.
	aStream decreaseIndent; nextPutAll: '].'.
%

category: 'other'
method: FunctionDefAst
setBlock: aBlockAst

	body := aBlockAst.
%
