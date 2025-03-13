! ------------------- Remove existing behavior from TextIOWrapper
removeallmethods TextIOWrapper
removeallclassmethods TextIOWrapper
! ------------------- Class methods for TextIOWrapper
category: 'other'
classmethod: TextIOWrapper
file: fileString mode: modeString buffering: bufferingInt encoding: anEncoding errors: anErrors newline: aNewline closefd: closeBool opener: anOpener

	^self basicNew 
		 file: fileString mode: modeString buffering: bufferingInt encoding: anEncoding errors: anErrors newline: aNewline closefd: closeBool opener: anOpener
%
! ------------------- Instance methods for TextIOWrapper
category: 'other'
method: TextIOWrapper
close

	^FunctionDef new
		block: [:currentScope |
			gsFile close.
		];
		yourself.
%
category: 'other'
method: TextIOWrapper
file: fileString mode: modeString buffering: bufferingInt encoding: anEncoding errors: anErrors newline: aNewline closefd: closeBool opener: anOpener

	file := fileString.
	mode := modeString.
	buffering := bufferingInt.
	encoding := anEncoding. 
	errors := anErrors.
	newline := aNewline.
	closefd := closeBool.
	opener := anOpener.

	gsFile := GsFile open: file ___value mode: mode ___value onClient: false. 
	gsFile ifNil: [self error: GsFile serverErrorString].
%
category: 'other'
method: TextIOWrapper
read
	"read(size=-1, /)"

	^FunctionDef new
		block: [:currentScope |
			| size string |
			size := currentScope at: #size.
			size == -1 ifTrue: [size := SmallInteger maximumValue].
			string := gsFile next: size.
			str ___value: string. 
		];
		params: #(#'size');
		defaults: #(-1);
		yourself.
%
category: 'other'
method: TextIOWrapper
write

	^FunctionDef new
		block: [:currentScope |
			gsFile nextPutAll: (currentScope at: #bytes) ___value.
		];
		params: #(#'bytes');
		yourself.
%
