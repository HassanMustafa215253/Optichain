
def rotate(matrix) -> None:
    for i in range(((len(matrix)+1))//2):
        for j in range(i, len(matrix)-i-1):
            matrix[i][j],matrix[j][-i-1]=matrix[j][-i-1],matrix[i][j]
            matrix[i][j],matrix[-i-1][-j-1]=matrix[-i-1][-j-1],matrix[i][j]
            matrix[i][j],matrix[-j-1][i]=matrix[-j-1][i],matrix[i][j]
            
rotate([[1,2,3],[4,5,6],[7,8,9]])