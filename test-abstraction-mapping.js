// Test to verify improved abstraction-file association
const sampleFilesData = [
    ["src/models/User.ts", `export class User {
        constructor(public id: string, public email: string) {}
        
        validateEmail(): boolean {
            return this.email.includes('@');
        }
    }`],
    
    ["src/services/UserService.ts", `import { User } from '../models/User';
    import { DatabaseConnection } from '../db/connection';
    
    export class UserService {
        constructor(private db: DatabaseConnection) {}
        
        async createUser(email: string): Promise<User> {
            const user = new User(generateId(), email);
            await this.db.save('users', user);
            return user;
        }
        
        async findUser(id: string): Promise<User | null> {
            return await this.db.findById('users', id);
        }
    }`],
    
    ["src/db/connection.ts", `export class DatabaseConnection {
        private connection: any;
        
        async connect(connectionString: string): Promise<void> {
            // Database connection logic
        }
        
        async save(collection: string, document: any): Promise<void> {
            // Save to database
        }
        
        async findById(collection: string, id: string): Promise<any> {
            // Find document by ID
        }
    }`],
    
    ["src/controllers/UserController.ts", `import { UserService } from '../services/UserService';
    
    export class UserController {
        constructor(private userService: UserService) {}
        
        async createUser(req: Request, res: Response) {
            const { email } = req.body;
            const user = await this.userService.createUser(email);
            res.json(user);
        }
        
        async getUser(req: Request, res: Response) {
            const { id } = req.params;
            const user = await this.userService.findUser(id);
            if (user) {
                res.json(user);
            } else {
                res.status(404).json({ error: 'User not found' });
            }
        }
    }`],
    
    ["src/utils/helpers.ts", `export function generateId(): string {
        return Math.random().toString(36).substring(2, 15);
    }
    
    export function formatDate(date: Date): string {
        return date.toISOString();
    }
    
    export function validateEmail(email: string): boolean {
        return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
    }`],
];

// Expected abstraction-file mapping for this sample:
// User Management System: files [0, 1, 3] (User.ts, UserService.ts, UserController.ts)
// Database Layer: files [2] (connection.ts) 
// Utility Functions: files [4] (helpers.ts)
// Or possibly:
// User Domain: files [0] (User.ts)
// User Business Logic: files [1, 3] (UserService.ts, UserController.ts)
// Database Infrastructure: files [2] (connection.ts)
// Utility/Helper Functions: files [4] (helpers.ts)

console.log("📝 Sample files for testing abstraction-file association:");
sampleFilesData.forEach(([path], index) => {
    console.log(`  File ${index}: ${path}`);
});

console.log("\n🎯 Expected associations (example):");
console.log("  - User Management: [0, 1, 3] (User model, service, controller)");
console.log("  - Database Layer: [2] (connection infrastructure)"); 
console.log("  - Utility Functions: [4] (helper utilities)");
console.log("\n✅ The improved workflow should now analyze actual file content");
console.log("   to determine these associations instead of round-robin assignment!");

module.exports = { sampleFilesData };