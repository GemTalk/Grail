! ------------------- Remove existing behavior from classmethodTest
expectvalue /Metaclass3
doit
classmethodTest removeAllMethods.
classmethodTest class removeAllMethods.
%
! ------------------- Class methods for classmethodTest
! ------------------- Instance methods for classmethodTest
set compile_env: 0
category: 'todo'
method: classmethodTest
test__func__
   #pyTodo
%
category: 'todo'
method: classmethodTest
test__get__
   #pyTodo
%
