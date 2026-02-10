! ------------------- Remove existing behavior from ArgAst
removeallmethods ArgAst
removeallclassmethods ArgAst
set compile_env: 0
! ------------------- Class methods for ArgAst
! ------------------- Instance methods for ArgAst
category: 'other'
method: ArgAst
name

	^arg
%
category: 'other'
method: ArgAst
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $(;
		nextPutAll: arg;
		nextPut: $);
		yourself.
%
category: 'other'
method: ArgAst
setTo: anObject scope: aScope

	aScope set: arg to: anObject.
%
