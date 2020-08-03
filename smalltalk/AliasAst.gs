! ------------------- Remove existing behavior from AliasAst
expectvalue /Metaclass3       
doit
AliasAst removeAllMethods.
AliasAst class removeAllMethods.
%
! ------------------- Class methods for AliasAst
! ------------------- Instance methods for AliasAst
set compile_env: 0
category: 'other'
method: AliasAst
<<<<<<< HEAD
asName
=======
import: aScope

	| function keywords module |
	function := aScope get: #'__import__'.
	keywords := SymbolDictionary new
		at: #'globals' 	put: self globals;
		at: #'locals'	put: aScope;
		at: #'fromlist'	put: #();
		at: #'level'		put: 0;
		yourself.
	module := function value: (Array with: name) value: keywords value: aScope.
	aScope set: name to: module.
>>>>>>> master

%
category: 'other'
method: AliasAst
initialize
	"alias = (identifier name, identifier? asname)"

	| stream |
	stream := self stream.
	name := self string asSymbol.
	(stream peekFor: $,) ifFalse: [self error].
	stream skipSeparators.
	(stream peekFor: $') ifTrue: [
		asName := (stream upTo: $') asSymbol.
		(stream peekFor: $)) ifFalse: [self error].
	] ifFalse: [
		| string |
		string := stream upTo: $).
		string = 'None' ifFalse: [self error].
		asName := nil.
	].
%
category: 'other'
method: AliasAst
name

	^name
%
