import { reference } from '../reference';
import type { CodeLanguage, ReferenceCode } from '../types';
import type { ExplorationId } from './exploration';

function snippets(java: string, go: string, python: string, note = ''): Record<CodeLanguage, ReferenceCode> {
  return { java: reference(`import java.util.*;\n\nclass Solution {\n${java}\n}`, note), go: reference(`package main\n\n${go}`, note), python: reference(`class Solution:\n${python}`, note) };
}
export const explorationReferences: Record<ExplorationId, Record<CodeLanguage, ReferenceCode>> = {
  'letter-combinations-of-a-phone-number': snippets(
`    public List<String> letterCombinations(String digits) {
        List<String> out = new ArrayList<>(); // @trace init
        String[] letters = {"", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"};
        if (!digits.isEmpty()) phone(digits, letters, 0, new StringBuilder(), out);
        return out; // @trace return
    }
    private void phone(String digits, String[] letters, int pos, StringBuilder path, List<String> out) {
        if (pos == digits.length()) { out.add(path.toString()); return; } // @trace save
        for (char c : letters[digits.charAt(pos) - '0'].toCharArray()) {
            path.append(c); // @trace choose
            phone(digits, letters, pos + 1, path, out);
            path.deleteCharAt(path.length() - 1); // @trace undo
        }
    }`,
`func letterCombinations(digits string) []string {
    out, path := []string{}, []byte{} // @trace init
    letters := []string{"", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"}
    var dfs func(int)
    dfs = func(pos int) {
        if pos == len(digits) { out = append(out, string(path)); return } // @trace save
        for _, c := range []byte(letters[digits[pos]-'0']) {
            path = append(path, c) // @trace choose
            dfs(pos+1)
            path = path[:len(path)-1] // @trace undo
        }
    }
    if len(digits) > 0 { dfs(0) }
    return out // @trace return
}`,
`    def letterCombinations(self, digits: str) -> list[str]:
        out, path = [], [] # @trace init
        letters = ["", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"]
        def dfs(pos):
            if pos == len(digits):
                out.append(''.join(path)) # @trace save
                return
            for char in letters[int(digits[pos])]:
                path.append(char) # @trace choose
                dfs(pos + 1)
                path.pop() # @trace undo
        if digits:
            dfs(0)
        return out # @trace return`),
  'generate-parentheses': snippets(
`    public List<String> generateParenthesis(int n) {
        List<String> out = new ArrayList<>(); // @trace init
        parentheses(n, 0, 0, new StringBuilder(), out);
        return out; // @trace return
    }
    private void parentheses(int n, int open, int close, StringBuilder path, List<String> out) {
        if (open == n && close == n) { out.add(path.toString()); return; } // @trace save
        for (int kind = 0; kind < 2; kind++) {
            boolean allowed = kind == 0 ? open < n : close < open;
            if (!allowed) continue; // @trace blocked
            path.append(kind == 0 ? '(' : ')'); // @trace choose
            parentheses(n, open + (kind == 0 ? 1 : 0), close + (kind == 1 ? 1 : 0), path, out);
            path.deleteCharAt(path.length() - 1); // @trace undo
        }
    }`,
`func generateParenthesis(n int) []string {
    out, path := []string{}, []byte{} // @trace init
    var dfs func(int, int)
    dfs = func(open, close int) {
        if open == n && close == n { out = append(out, string(path)); return } // @trace save
        for kind := 0; kind < 2; kind++ {
            allowed := (kind == 0 && open < n) || (kind == 1 && close < open)
            if !allowed { continue } // @trace blocked
            a, b, c := open, close, byte('(')
            if kind == 0 { a++ } else { b++; c = ')' }
            path = append(path, c) // @trace choose
            dfs(a, b)
            path = path[:len(path)-1] // @trace undo
        }
    }
    dfs(0, 0)
    return out // @trace return
}`,
`    def generateParenthesis(self, n: int) -> list[str]:
        out, path = [], [] # @trace init
        def dfs(opened, closed):
            if opened == n and closed == n:
                out.append(''.join(path)) # @trace save
                return
            for kind, char in enumerate('()'):
                allowed = opened < n if kind == 0 else closed < opened
                if not allowed:
                    continue # @trace blocked
                path.append(char) # @trace choose
                dfs(opened + (kind == 0), closed + (kind == 1))
                path.pop() # @trace undo
        dfs(0, 0)
        return out # @trace return`),
  'palindrome-partitioning': snippets(
`    public List<List<String>> partition(String s) {
        List<List<String>> out = new ArrayList<>(); // @trace init
        split(s, 0, new ArrayList<>(), out);
        return out; // @trace return
    }
    private void split(String s, int start, List<String> path, List<List<String>> out) {
        if (start == s.length()) { out.add(new ArrayList<>(path)); return; } // @trace save
        for (int end = start; end < s.length(); end++) {
            int a = start, b = end;
            while (a < b && s.charAt(a) == s.charAt(b)) { a++; b--; }
            boolean valid = a >= b; // @trace check
            if (!valid) continue;
            path.add(s.substring(start, end + 1)); // @trace choose
            split(s, end + 1, path, out);
            path.remove(path.size() - 1); // @trace undo
        }
    }`,
`func partition(s string) [][]string {
    out, path := [][]string{}, []string{} // @trace init
    var dfs func(int)
    dfs = func(start int) {
        if start == len(s) { out = append(out, append([]string{}, path...)); return } // @trace save
        for end := start; end < len(s); end++ {
            a, b := start, end
            for a < b && s[a] == s[b] { a++; b-- }
            valid := a >= b // @trace check
            if !valid { continue }
            path = append(path, s[start:end+1]) // @trace choose
            dfs(end+1)
            path = path[:len(path)-1] // @trace undo
        }
    }
    dfs(0)
    return out // @trace return
}`,
`    def partition(self, s: str) -> list[list[str]]:
        out, path = [], [] # @trace init
        def dfs(start):
            if start == len(s):
                out.append(path.copy()) # @trace save
                return
            for end in range(start, len(s)):
                a, b = start, end
                while a < b and s[a] == s[b]:
                    a, b = a + 1, b - 1
                valid = a >= b # @trace check
                if not valid:
                    continue
                path.append(s[start:end + 1]) # @trace choose
                dfs(end + 1)
                path.pop() # @trace undo
        dfs(0)
        return out # @trace return`, '演示输入限定 ASCII 字母，区分大小写。'),
  'word-search': snippets(
`    public boolean exist(char[][] board, String word) {
        int rows = board.length, cols = rows == 0 ? 0 : board[0].length; // @trace init
        if (word.isEmpty()) return true;
        if (word.length() > rows * cols) return false; // @trace impossible
        boolean[][] used = new boolean[rows][cols]; boolean found = false;
        for (int r = 0; r < rows && !found; r++)
            for (int c = 0; c < cols && !found; c++) found = search(board, word, r, c, 0, used);
        return found; // @trace return
    }
    private boolean search(char[][] board, String word, int r, int c, int i, boolean[][] used) {
        if (r < 0 || r >= board.length || c < 0 || c >= board[0].length || used[r][c] || board[r][c] != word.charAt(i)) return false;
        used[r][c] = true; // @trace choose
        boolean found = i + 1 == word.length(); // @trace found
        int[][] dirs = {{-1,0},{0,1},{1,0},{0,-1}};
        if (!found) for (int[] d : dirs) if (search(board, word, r+d[0], c+d[1], i+1, used)) { found = true; break; }
        used[r][c] = false; // @trace undo
        return found;
    }`,
`func exist(board [][]byte, word string) bool {
    rows, cols := len(board), 0; if rows > 0 { cols = len(board[0]) } // @trace init
    if len(word) == 0 { return true }
    if len(word) > rows*cols { return false } // @trace impossible
    used := make([][]bool, rows); for r := range used { used[r] = make([]bool, cols) }
    var dfs func(int, int, int) bool
    dfs = func(r, c, i int) bool {
        if r < 0 || r >= rows || c < 0 || c >= cols || used[r][c] || board[r][c] != word[i] { return false }
        used[r][c] = true // @trace choose
        found := i+1 == len(word) // @trace found
        if !found { for _, d := range [][2]int{{-1,0},{0,1},{1,0},{0,-1}} { if dfs(r+d[0], c+d[1], i+1) { found = true; break } } }
        used[r][c] = false // @trace undo
        return found
    }
    found := false
    for r := 0; r < rows && !found; r++ { for c := 0; c < cols && !found; c++ { found = dfs(r,c,0) } }
    return found // @trace return
}`,
`    def exist(self, board: list[list[str]], word: str) -> bool:
        rows, cols = len(board), len(board[0]) if board else 0 # @trace init
        if not word:
            return True
        if len(word) > rows * cols:
            return False # @trace impossible
        used = set()
        def dfs(r, c, i):
            if not (0 <= r < rows and 0 <= c < cols) or (r,c) in used or board[r][c] != word[i]:
                return False
            used.add((r,c)) # @trace choose
            found = i + 1 == len(word) # @trace found
            if not found:
                for dr, dc in [(-1,0),(0,1),(1,0),(0,-1)]:
                    if dfs(r+dr,c+dc,i+1):
                        found = True
                        break
            used.remove((r,c)) # @trace undo
            return found
        found = any(dfs(r,c,0) for r in range(rows) for c in range(cols))
        return found # @trace return`, '不修改 board；空单词定义为 true，演示限 ASCII 字母与四邻接。'),
  'n-queens': snippets(
`    public List<List<String>> solveNQueens(int n) {
        List<List<String>> out = new ArrayList<>(); // @trace init
        queens(n, 0, new int[n], new boolean[n], new boolean[2*n], new boolean[2*n], out);
        return out; // @trace return
    }
    private void queens(int n, int row, int[] placed, boolean[] cols, boolean[] down, boolean[] up, List<List<String>> out) {
        if (row == n) {
            List<String> board = new ArrayList<>();
            for (int r = 0; r < n; r++) { char[] line = new char[n]; Arrays.fill(line, '.'); line[placed[r]] = 'Q'; board.add(new String(line)); }
            out.add(board); return; // @trace save
        }
        for (int c = 0; c < n; c++) {
            if (cols[c] || down[row-c+n] || up[row+c]) continue; // @trace blocked
            placed[row] = c; cols[c] = down[row-c+n] = up[row+c] = true; // @trace choose
            queens(n, row+1, placed, cols, down, up, out);
            cols[c] = down[row-c+n] = up[row+c] = false; // @trace undo
        }
    }`,
`func solveNQueens(n int) [][]string {
    out := [][]string{} // @trace init
    placed, cols, down, up := make([]int,n), make([]bool,n), make([]bool,2*n), make([]bool,2*n)
    var dfs func(int)
    dfs = func(row int) {
        if row == n {
            board := []string{}
            for r := 0; r < n; r++ { line := make([]byte,n); for c := range line { line[c] = '.' }; line[placed[r]] = 'Q'; board = append(board,string(line)) }
            out = append(out,board); return // @trace save
        }
        for c := 0; c < n; c++ {
            if cols[c] || down[row-c+n] || up[row+c] { continue } // @trace blocked
            placed[row] = c; cols[c], down[row-c+n], up[row+c] = true, true, true // @trace choose
            dfs(row+1)
            cols[c], down[row-c+n], up[row+c] = false, false, false // @trace undo
        }
    }
    dfs(0)
    return out // @trace return
}`,
`    def solveNQueens(self, n: int) -> list[list[str]]:
        out, placed, cols, down, up = [], [], set(), set(), set() # @trace init
        def dfs(row):
            if row == n:
                out.append(['.' * c + 'Q' + '.' * (n-c-1) for c in placed]) # @trace save
                return
            for c in range(n):
                if c in cols or row-c in down or row+c in up:
                    continue # @trace blocked
                placed.append(c); cols.add(c); down.add(row-c); up.add(row+c) # @trace choose
                dfs(row+1)
                placed.pop(); cols.remove(c); down.remove(row-c); up.remove(row+c) # @trace undo
        dfs(0)
        return out # @trace return`),
  'number-of-islands': snippets(
`    public int numIslands(int[][] grid) {
        int rows = grid.length, cols = rows == 0 ? 0 : grid[0].length, count = 0; // @trace init
        boolean[][] seen = new boolean[rows][cols]; int[][] dirs = {{-1,0},{0,1},{1,0},{0,-1}};
        for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) {
            if (grid[r][c] != 1 || seen[r][c]) continue;
            count++; seen[r][c] = true; Deque<int[]> queue = new ArrayDeque<>(); queue.add(new int[]{r,c}); // @trace start
            while (!queue.isEmpty()) {
                int[] node = queue.remove(); // @trace dequeue
                for (int[] d : dirs) {
                    int a = node[0]+d[0], b = node[1]+d[1];
                    if (a >= 0 && a < rows && b >= 0 && b < cols && grid[a][b] == 1 && !seen[a][b]) {
                        seen[a][b] = true; queue.add(new int[]{a,b}); // @trace discover
                    }
                }
            }
        }
        return count; // @trace return
    }`,
`func numIslands(grid [][]int) int {
    rows, cols, count := len(grid), 0, 0; if rows > 0 { cols = len(grid[0]) } // @trace init
    seen := make([][]bool,rows); for r := range seen { seen[r] = make([]bool,cols) }
    for r := 0; r < rows; r++ { for c := 0; c < cols; c++ {
        if grid[r][c] != 1 || seen[r][c] { continue }
        count++; seen[r][c] = true; queue := [][2]int{{r,c}} // @trace start
        for head := 0; head < len(queue); head++ {
            node := queue[head] // @trace dequeue
            for _, d := range [][2]int{{-1,0},{0,1},{1,0},{0,-1}} {
                a,b := node[0]+d[0],node[1]+d[1]
                if a >= 0 && a < rows && b >= 0 && b < cols && grid[a][b] == 1 && !seen[a][b] {
                    seen[a][b] = true; queue = append(queue,[2]int{a,b}) // @trace discover
                }
            }
        }
    } }
    return count // @trace return
}`,
`    def numIslands(self, grid: list[list[int]]) -> int:
        from collections import deque
        rows, cols, count = len(grid), len(grid[0]) if grid else 0, 0 # @trace init
        seen = set()
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] != 1 or (r,c) in seen:
                    continue
                count += 1; seen.add((r,c)); queue = deque([(r,c)]) # @trace start
                while queue:
                    a, b = queue.popleft() # @trace dequeue
                    for dr, dc in [(-1,0),(0,1),(1,0),(0,-1)]:
                        x, y = a+dr, b+dc
                        if 0 <= x < rows and 0 <= y < cols and grid[x][y] == 1 and (x,y) not in seen:
                            seen.add((x,y)); queue.append((x,y)) # @trace discover
        return count # @trace return`, '这里使用整数 0/1 网格；平台字符网格可先把字符转成对应数字。'),
  'rotting-oranges': snippets(
`    public int orangesRotting(int[][] grid) {
        int rows = grid.length, cols = rows == 0 ? 0 : grid[0].length, fresh = 0, minute = 0; // @trace init
        Deque<int[]> queue = new ArrayDeque<>();
        for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) {
            if (grid[r][c] == 2) queue.add(new int[]{r,c}); else if (grid[r][c] == 1) fresh++;
        }
        int[][] dirs = {{-1,0},{0,1},{1,0},{0,-1}};
        while (!queue.isEmpty() && fresh > 0) {
            int size = queue.size(); minute++; // @trace layer
            for (int i = 0; i < size; i++) {
                int[] node = queue.remove(); // @trace dequeue
                for (int[] d : dirs) {
                    int r = node[0]+d[0], c = node[1]+d[1];
                    if (r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] == 1) {
                        grid[r][c] = 2; fresh--; queue.add(new int[]{r,c}); // @trace infect
                    }
                }
            }
        }
        return fresh == 0 ? minute : -1; // @trace return
    }`,
`func orangesRotting(grid [][]int) int {
    rows, cols, fresh, minute := len(grid), 0, 0, 0; if rows > 0 { cols = len(grid[0]) } // @trace init
    queue := [][2]int{}
    for r := 0; r < rows; r++ { for c := 0; c < cols; c++ { if grid[r][c] == 2 { queue = append(queue,[2]int{r,c}) } else if grid[r][c] == 1 { fresh++ } } }
    head := 0
    for head < len(queue) && fresh > 0 {
        end := len(queue); minute++ // @trace layer
        for head < end {
            node := queue[head]; head++ // @trace dequeue
            for _, d := range [][2]int{{-1,0},{0,1},{1,0},{0,-1}} {
                r,c := node[0]+d[0],node[1]+d[1]
                if r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] == 1 {
                    grid[r][c] = 2; fresh--; queue = append(queue,[2]int{r,c}) // @trace infect
                }
            }
        }
    }
    if fresh > 0 { return -1 }; return minute // @trace return
}`,
`    def orangesRotting(self, grid: list[list[int]]) -> int:
        from collections import deque
        rows, cols, fresh, minute = len(grid), len(grid[0]) if grid else 0, 0, 0 # @trace init
        queue = deque()
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == 2:
                    queue.append((r,c))
                elif grid[r][c] == 1:
                    fresh += 1
        while queue and fresh:
            size = len(queue); minute += 1 # @trace layer
            for _ in range(size):
                r, c = queue.popleft() # @trace dequeue
                for dr, dc in [(-1,0),(0,1),(1,0),(0,-1)]:
                    a, b = r+dr, c+dc
                    if 0 <= a < rows and 0 <= b < cols and grid[a][b] == 1:
                        grid[a][b] = 2; fresh -= 1; queue.append((a,b)) # @trace infect
        return minute if fresh == 0 else -1 # @trace return`, '参考函数会原地更新 grid；演示执行器只更新解析后的副本，不修改调用方输入。'),
  'course-schedule': snippets(
`    public boolean canFinish(int numCourses, int[][] prerequisites) {
        List<List<Integer>> next = new ArrayList<>(); int[] degree = new int[numCourses]; // @trace init
        for (int i = 0; i < numCourses; i++) next.add(new ArrayList<>());
        for (int[] pair : prerequisites) { next.get(pair[1]).add(pair[0]); degree[pair[0]]++; }
        Deque<Integer> queue = new ArrayDeque<>();
        for (int i = 0; i < numCourses; i++) if (degree[i] == 0) queue.add(i);
        int completed = 0;
        while (!queue.isEmpty()) {
            int node = queue.remove(); completed++; // @trace dequeue
            for (int child : next.get(node)) {
                degree[child]--; // @trace release
                if (degree[child] == 0) queue.add(child); // @trace enqueue
            }
        }
        boolean valid = completed == numCourses; // @trace check
        return valid; // @trace return
    }`,
`func canFinish(numCourses int, prerequisites [][]int) bool {
    next, degree := make([][]int,numCourses), make([]int,numCourses) // @trace init
    for _, p := range prerequisites { next[p[1]] = append(next[p[1]],p[0]); degree[p[0]]++ }
    queue := []int{}; for i,d := range degree { if d == 0 { queue = append(queue,i) } }
    completed := 0
    for head := 0; head < len(queue); head++ {
        node := queue[head]; completed++ // @trace dequeue
        for _, child := range next[node] {
            degree[child]-- // @trace release
            if degree[child] == 0 { queue = append(queue,child) } // @trace enqueue
        }
    }
    valid := completed == numCourses // @trace check
    return valid // @trace return
}`,
`    def canFinish(self, numCourses: int, prerequisites: list[list[int]]) -> bool:
        from collections import deque
        next_nodes, degree = [[] for _ in range(numCourses)], [0] * numCourses # @trace init
        for course, pre in prerequisites:
            next_nodes[pre].append(course)
            degree[course] += 1
        queue = deque(i for i,d in enumerate(degree) if d == 0)
        completed = 0
        while queue:
            node = queue.popleft(); completed += 1 # @trace dequeue
            for child in next_nodes[node]:
                degree[child] -= 1 # @trace release
                if degree[child] == 0:
                    queue.append(child) # @trace enqueue
        valid = completed == numCourses # @trace check
        return valid # @trace return`),
  'spiral-matrix': snippets(
`    public List<Integer> spiralOrder(int[][] matrix) {
        List<Integer> out = new ArrayList<>(); // @trace init
        int top = 0, bottom = matrix.length-1, left = 0, right = matrix.length == 0 ? -1 : matrix[0].length-1;
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) read(matrix,top,c,out);
            top++; // @trace top
            for (int r = top; r <= bottom; r++) read(matrix,r,right,out);
            right--; // @trace right
            if (top <= bottom) {
                for (int c = right; c >= left; c--) read(matrix,bottom,c,out);
                bottom--; // @trace bottom
            }
            if (left <= right) {
                for (int r = bottom; r >= top; r--) read(matrix,r,left,out);
                left++; // @trace left
            }
        }
        return out; // @trace return
    }
    private void read(int[][] matrix, int r, int c, List<Integer> out) {
        out.add(matrix[r][c]); // @trace read
    }`,
`func spiralOrder(matrix [][]int) []int {
    out := []int{} // @trace init
    read := func(r,c int) { out = append(out,matrix[r][c]) } // @trace read
    top,bottom,left,right := 0,len(matrix)-1,0,-1; if len(matrix) > 0 { right = len(matrix[0])-1 }
    for top <= bottom && left <= right {
        for c := left; c <= right; c++ { read(top,c) }
        top++ // @trace top
        for r := top; r <= bottom; r++ { read(r,right) }
        right-- // @trace right
        if top <= bottom { for c := right; c >= left; c-- { read(bottom,c) }; bottom-- } // @trace bottom
        if left <= right { for r := bottom; r >= top; r-- { read(r,left) }; left++ } // @trace left
    }
    return out // @trace return
}`,
`    def spiralOrder(self, matrix: list[list[int]]) -> list[int]:
        out = [] # @trace init
        def read(r,c):
            out.append(matrix[r][c]) # @trace read
        top, bottom, left, right = 0, len(matrix)-1, 0, len(matrix[0])-1 if matrix else -1
        while top <= bottom and left <= right:
            for c in range(left,right+1):
                read(top,c)
            top += 1 # @trace top
            for r in range(top,bottom+1):
                read(r,right)
            right -= 1 # @trace right
            if top <= bottom:
                for c in range(right,left-1,-1):
                    read(bottom,c)
                bottom -= 1 # @trace bottom
            if left <= right:
                for r in range(bottom,top-1,-1):
                    read(r,left)
                left += 1 # @trace left
        return out # @trace return`),
  'set-matrix-zeroes': snippets(
`    public int[][] setZeroes(int[][] matrix) {
        int rows = matrix.length, cols = rows == 0 ? 0 : matrix[0].length; // @trace init
        if (rows == 0 || cols == 0) return matrix;
        boolean firstRow = false, firstCol = false;
        for (int c = 0; c < cols; c++) firstRow |= matrix[0][c] == 0;
        for (int r = 0; r < rows; r++) firstCol |= matrix[r][0] == 0; // @trace flags
        for (int r = 1; r < rows; r++) for (int c = 1; c < cols; c++) {
            if (matrix[r][c] == 0) { matrix[r][0] = 0; matrix[0][c] = 0; } // @trace mark
        }
        for (int r = 1; r < rows; r++) for (int c = 1; c < cols; c++) {
            if (matrix[r][0] == 0 || matrix[0][c] == 0) matrix[r][c] = 0; // @trace zero
        }
        if (firstRow) for (int c = 0; c < cols; c++) matrix[0][c] = 0; // @trace first-row
        if (firstCol) for (int r = 0; r < rows; r++) matrix[r][0] = 0; // @trace first-col
        return matrix; // @trace return
    }`,
`func setZeroes(matrix [][]int) [][]int {
    rows,cols := len(matrix),0; if rows > 0 { cols = len(matrix[0]) } // @trace init
    if rows == 0 || cols == 0 { return matrix }
    firstRow,firstCol := false,false
    for c := 0; c < cols; c++ { firstRow = firstRow || matrix[0][c] == 0 }
    for r := 0; r < rows; r++ { firstCol = firstCol || matrix[r][0] == 0 } // @trace flags
    for r := 1; r < rows; r++ { for c := 1; c < cols; c++ {
        if matrix[r][c] == 0 { matrix[r][0],matrix[0][c] = 0,0 } // @trace mark
    } }
    for r := 1; r < rows; r++ { for c := 1; c < cols; c++ {
        if matrix[r][0] == 0 || matrix[0][c] == 0 { matrix[r][c] = 0 } // @trace zero
    } }
    if firstRow { for c := 0; c < cols; c++ { matrix[0][c] = 0 } } // @trace first-row
    if firstCol { for r := 0; r < rows; r++ { matrix[r][0] = 0 } } // @trace first-col
    return matrix // @trace return
}`,
`    def setZeroes(self, matrix: list[list[int]]) -> list[list[int]]:
        rows, cols = len(matrix), len(matrix[0]) if matrix else 0 # @trace init
        if not rows or not cols:
            return matrix
        first_row = any(value == 0 for value in matrix[0])
        first_col = any(row[0] == 0 for row in matrix) # @trace flags
        for r in range(1,rows):
            for c in range(1,cols):
                if matrix[r][c] == 0:
                    matrix[r][0] = matrix[0][c] = 0 # @trace mark
        for r in range(1,rows):
            for c in range(1,cols):
                if matrix[r][0] == 0 or matrix[0][c] == 0:
                    matrix[r][c] = 0 # @trace zero
        if first_row:
            for c in range(cols):
                matrix[0][c] = 0 # @trace first-row
        if first_col:
            for r in range(rows):
                matrix[r][0] = 0 # @trace first-col
        return matrix # @trace return`, '原地修改矩阵；这里额外返回同一矩阵用于展示，平台 void 签名可省略返回值。'),
};
