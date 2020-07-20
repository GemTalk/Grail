! ------------------- Remove existing behavior from List
expectvalue /Metaclass3       
doit
List removeAllMethods.
List class removeAllMethods.
%
! ------------------- Class methods for List
! ------------------- Instance methods for List
set compile_env: 0
category: 'other'
method: List
append: arguments keywords: keywords

^self add: arguments first
%
