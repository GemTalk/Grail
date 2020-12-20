! ------------------- Remove existing behavior from BaseException
removeAllMethods BaseException
removeAllClassMethods BaseException
! ------------------- Class methods for BaseException
set compile_env: 0
category: 'other'
classmethod: BaseException
value: arguments value: keywords value: scope

	self signal: (arguments at: 1).
%
! ------------------- Instance methods for BaseException
