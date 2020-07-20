! ------------------- Remove existing behavior from ExtSliceAst
expectvalue /Metaclass3       
doit
ExtSliceAst removeAllMethods.
ExtSliceAst class removeAllMethods.
%
! ------------------- Class methods for ExtSliceAst
! ------------------- Instance methods for ExtSliceAst
set compile_env: 0
category: 'other'
method: ExtSliceAst
children

	^super children
		addAll: dims;
		yourself
%
category: 'other'
method: ExtSliceAst
initialize
	"ExtSlice(slice* dims)"
	
	self halt.
%
