! ------------------- Remove existing behavior from TryAst
removeAllMethods TryAst
removeAllClassMethods TryAst
! ------------------- Class methods for TryAst
! ------------------- Instance methods for TryAst
set compile_env: 0
category: 'other'
method: TryAst
initialize
	"Try(stmt* body, excepthandler* handlers, stmt* orelse, stmt* finalbody)"

	body := SuiteAst parent: self.
	self commaSpace.
	handlers := self collectAst: [ExceptHandlerAst parent: self].
	self commaSpace.
	orelse := SuiteAst parent: self.
	self commaSpace.
	finalbody := SuiteAst parent: self.
	self readPosition.
%
category: 'other'
method: TryAst
printSmalltalkOn: aStream

	| currentTabIndex |
	currentTabIndex := 0.

	1 to: handlers size do: [ :i |
		1 to: currentTabIndex do: [ :j |
			aStream tab.
		].
		aStream nextPutAll: '[';
			lf; yourself.
		currentTabIndex := currentTabIndex + 1.
	].
	finalbody body size > 0 ifTrue: [
		1 to: currentTabIndex do: [ :j |
			aStream tab.
		].
		aStream nextPutAll: '[';
			lf; yourself.
		currentTabIndex := currentTabIndex + 1.
	].
	1 to: currentTabIndex do: [ :j |
		aStream tab.
	].
	self smalltalkSourceFor: body parenthesisIf: 4 on: aStream. " Doesn't need parenthesis "
	handlers do: [ :handler |
		currentTabIndex := currentTabIndex - 1.
		aStream lf.
		1 to: currentTabIndex do: [ :j |
			aStream tab.
		].
		aStream nextPutAll: '] on: '.

		handler type = 'None' ifTrue: [
			aStream nextPutAll: 'Exception'.
		] ifFalse: [
			aStream nextPutAll: handler type id asString.
		].

		aStream nextPutAll: ' do: [';
			lf; yourself.

		currentTabIndex := currentTabIndex + 1.
		1 to: currentTabIndex do: [ :j |
			aStream tab.
		].
		self smalltalkSourceFor: handler body parenthesisIf: 4 on: aStream. " Doesn't need parenthesis "
		currentTabIndex := currentTabIndex - 1.
		aStream lf.
		1 to: currentTabIndex do: [ :j |
			aStream tab.
		].
		aStream nextPutAll: ']'.
	].
	
	currentTabIndex := currentTabIndex - 1.

	finalbody body size > 0 ifTrue: [
		aStream lf; nextPutAll: '] ensure: ['; lf; yourself.
		currentTabIndex := currentTabIndex + 1.
		1 to: currentTabIndex do: [ :j |
			aStream tab.
		].
		self smalltalkSourceFor: finalbody parenthesisIf: 4 on: aStream. " Doesn't need parenthesis "
		aStream lf; nextPutAll: '].'; yourself.
		currentTabIndex := currentTabIndex - 1.
	] ifFalse: [
		aStream nextPut: $..
	].
%
