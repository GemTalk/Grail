! ------------------- Remove existing behavior from SubscriptAst
removeallmethods SubscriptAst
removeallclassmethods SubscriptAst
set compile_env: 0
! ------------------- Class methods for SubscriptAst
! ------------------- Instance methods for SubscriptAst
category: 'other'
method: SubscriptAst
assertContextIsLoad

	ctx assertIsLoad.
%
category: 'other'
method: SubscriptAst
assertContextIsStore

	ctx assertIsStore.
%
category: 'other'
method: SubscriptAst
declareVariable

	value declareVariable.
%
category: 'other'
method: SubscriptAst
printSmalltalkOn: aStream

	self assertContextIsLoad.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __getitem__: '.
	slice printSmalltalkWithParenthesisOn: aStream.
%
