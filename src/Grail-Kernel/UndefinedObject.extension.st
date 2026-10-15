Extension { #name : 'UndefinedObject' }

{ #category : 'Grail-Bridge' }
UndefinedObject >> cantPerform: aSymbol withArguments: anArray env: envId [
	"Symmetric handler for the perform:env: dispatch path."

	envId = 1 ifFalse: [
		^ super cantPerform: aSymbol withArguments: anArray env: envId
	].
	^ UnboundLocalError @env1:___signal___:
		('local variable referenced before assignment (received '
			, aSymbol printString
			, ' on nil)')

]

{ #category : 'Grail-Bridge' }
UndefinedObject >> doesNotUnderstand: aSymbol args: anArray envId: envId [
	"Catch env-1 message sends to nil and raise UnboundLocalError. For env-0
	messages, fall through to the standard handler so non-Python code sees
	a regular MessageNotUnderstood."

	envId = 1 ifFalse: [
		^ super doesNotUnderstand: aSymbol args: anArray envId: envId
	].
	^ UnboundLocalError @env1:___signal___:
		('local variable referenced before assignment (received '
			, aSymbol printString
			, ' on nil)')

]
