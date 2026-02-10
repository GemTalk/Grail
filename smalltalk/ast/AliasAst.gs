! ------------------- Remove existing behavior from AliasAst
removeallmethods AliasAst
removeallclassmethods AliasAst
set compile_env: 0
! ------------------- Class methods for AliasAst
! ------------------- Instance methods for AliasAst
category: 'other'
method: AliasAst
asName

	^asName
%
category: 'other'
method: AliasAst
name

	^name
%
category: 'other'
method: AliasAst
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $(;
		nextPutAll: name;
		yourself.
	asName ifNotNil: [
		aStream
			nextPutAll: ' as ';
			nextPutAll: asName;
			yourself.
	].
	aStream nextPut: $).
%
