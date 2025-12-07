! ------------------- Remove existing behavior from WithAst
removeallmethods WithAst
removeallclassmethods WithAst
! ------------------- Class methods for WithAst
! ------------------- Instance methods for WithAst
category: 'other'
method: WithAst
initialize
	"AsyncWith(withitem* items, stmt* body, string? type_comment)"

	items := self collectAst: [WithItemAst parent: self].
	self commaSpace.
	body := SuiteAst parent: self.
	self commaSpace. 
	type_comment := self optionalString.
	self readPosition.
%
category: 'other'
method: WithAst
printSmalltalkOn: aStream

"manager = (EXPRESSION)
enter = type(manager).__enter__
exit = type(manager).__exit__
value = enter(manager)
hit_except = False

try:
    TARGET = value
    SUITE
except:
    hit_except = True
    if not exit(manager, *sys.exc_info()):
        raise
finally:
    if not hit_except:
        exit(manager, None, None, None)"

	items do: [:each |
		aStream 
			nextPutAll: '[:currentScope |'; lf; increaseIndent; 
			nextPutAll: '| manager enter exit value hit_except |'; lf; 
			nextPutAll: 'manager := ';
			yourself.
		each context_expr printSmalltalkOn: aStream. 
		aStream 
			nextPutAll: '.'; lf;
			nextPutAll: 'enter := manager __enter__.'; lf;
			nextPutAll: 'exit := manager __exit__.'; lf;
			nextPutAll: 'value := enter scope: currentScope positional: None named: None.'; lf;
			nextPutAll: 'hit_except := false.'; lf;
			nextPutAll: '['; lf; increaseIndent; 
			nextPutAll: '['; lf; increaseIndent; 
			yourself.
		each optional_vars printSmalltalkOn: aStream. 
		aStream nextPutAll: 'value.'; lf;
			yourself.
		body printSmalltalkOn: aStream. 
		aStream 
			decreaseIndent;
			nextPutAll: '] on: Error do: [:ex | '; lf; increaseIndent;
			nextPutAll: 'hit_except := true.'; lf;
			nextPutAll: 'self halt.'; lf; decreaseIndent;
			nextPutAll: '].'; lf; decreaseIndent;
			nextPutAll: '] ensure: ['; lf; increaseIndent;
			nextPutAll: 'hit_except ifFalse: ['; lf; increaseIndent;
			nextPutAll: 'exit scope: currentScope positional: { None. None. None. } named: #().'; lf; decreaseIndent;
			nextPutAll: '].'; lf; decreaseIndent;
			nextPutAll: '].'; lf; decreaseIndent;
			nextPutAll: '] value: currentScope';
			yourself.
	].
%
