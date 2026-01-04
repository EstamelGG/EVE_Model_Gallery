# -*- coding: utf-8 -*-
import zipfile
import sqlite3
import json
from pathlib import Path
from typing import Dict, Set, Optional
import shutil

class EVEDataInitializer:
    def __init__(self):
        self.sde_path = Path("sde")
        self.output_path = Path("docs") / "statics"
        self.icons_path = self.output_path / "icons"
        self.temp_icons_path = Path("icons_temp")
        self.models_path = Path("docs") / "models"
        
        # 清空输出目录
        if self.output_path.exists():
            shutil.rmtree(self.output_path)
        
        # 创建必要的目录
        self.output_path.mkdir(exist_ok=True)
        self.icons_path.mkdir(exist_ok=True, parents=True)
        
    def extract_zip_files(self):
        """解压sde目录下的zip文件"""
        print("开始解压文件...")
        
        # 解压图标文件到临时目录
        icons_zip_path = self.sde_path / "icons.zip"
        if icons_zip_path.exists():
            if self.temp_icons_path.exists():
                shutil.rmtree(self.temp_icons_path)
            self.temp_icons_path.mkdir(exist_ok=True)
            
            with zipfile.ZipFile(icons_zip_path, 'r') as zip_ref:
                zip_ref.extractall(self.temp_icons_path)
            print(f"图标文件已解压")
        else:
            print(f"警告: 未找到图标文件 {icons_zip_path}")
        
        # 解压SDE文件（数据库文件在sde/db/目录下）
        sde_zip_path = self.sde_path / "sde.zip"
        if sde_zip_path.exists():
            with zipfile.ZipFile(sde_zip_path, 'r') as zip_ref:
                zip_ref.extractall(self.sde_path)
            print(f"SDE文件已解压")
        else:
            print(f"警告: 未找到SDE文件 {sde_zip_path}")
    
    def connect_database(self, db_name: str) -> Optional[sqlite3.Connection]:
        """连接SQLite数据库"""
        db_file = self.sde_path / "db" / f"item_db_{db_name}.sqlite"
        if not db_file.exists():
            print(f"错误: 数据库文件不存在 {db_file}")
            return None
            
        try:
            conn = sqlite3.connect(db_file)
            conn.row_factory = sqlite3.Row
            print(f"{db_name.upper()}数据库连接成功")
            return conn
        except Exception as e:
            print(f"数据库连接失败: {e}")
            return None
    
    def load_data(self, conn: sqlite3.Connection, lang: str) -> Dict:
        """加载指定语言的数据（只查询categoryID为6和65）"""
        print(f"加载{lang.upper()}数据...")
        
        query = """
        SELECT 
            t.type_id,
            t.en_name,
            t.zh_name,
            t.categoryID,
            t.groupID,
            t.icon_filename,
            c.name as category_name,
            c.icon_filename AS category_icon_name,
            g.name as group_name,
            g.icon_filename AS group_icon_name
        FROM types t
        LEFT JOIN categories c ON t.categoryID = c.category_id
        LEFT JOIN groups g ON t.groupID = g.group_id
        WHERE t.categoryID IN (6, 65) AND t.published = 1
        """
        
        cursor = conn.execute(query)
        categories = {}
        groups = {}
        types = {}
        icon_names = set()
        
        # 根据语言选择名称字段
        name_field = 'zh_name' if lang == 'zh' else 'en_name'
        
        for row in cursor:
            type_id = row['type_id']
            category_id = row['categoryID']
            group_id = row['groupID']
            
            # 收集类型信息（同时保存中英文名称）
            types[type_id] = {
                'id': type_id,
                'name': row[name_field] or row['en_name'],
                'name_en': row['en_name'] or '',
                'name_zh': row['zh_name'] or '',
                'categoryID': category_id,
                'groupID': group_id,
                'icon_name': row['icon_filename']
            }
            
            # 收集分类信息
            if category_id and category_id not in categories:
                categories[category_id] = {
                    'id': category_id,
                    'name': row['category_name'] or '',
                    'icon_name': row['category_icon_name']
                }
                if row['category_icon_name']:
                    icon_names.add(row['category_icon_name'])
            
            # 收集组信息
            if group_id and group_id not in groups:
                groups[group_id] = {
                    'id': group_id,
                    'name': row['group_name'] or '',
                    'categoryID': category_id,
                    'icon_name': row['group_icon_name']
                }
                if row['group_icon_name']:
                    icon_names.add(row['group_icon_name'])
        
        print(f"  加载了 {len(types)} 个类型，{len(categories)} 个分类，{len(groups)} 个组")
        
        return {
            'categories': categories,
            'groups': groups,
            'types': types,
            'icon_names': icon_names
        }
    
    def build_category_tree(self, data: Dict, model_map: Dict[int, str] = None) -> list:
        """构建category -> group -> type三层树结构"""
        categories = data['categories']
        groups = data['groups']
        types = data['types']
        
        if model_map is None:
            model_map = {}
        
        # 构建树结构
        category_map = {}
        
        # 初始化所有category节点
        for category_id, category_info in categories.items():
            category_map[category_id] = {
                'id': category_id,
                'name': category_info['name'],
                'icon_name': category_info.get('icon_name'),
                'groups': {}
            }
        
        # 添加groups到categories
        for group_id, group_info in groups.items():
            category_id = group_info.get('categoryID')
            if category_id and category_id in category_map:
                category_map[category_id]['groups'][group_id] = {
                    'id': group_id,
                    'name': group_info['name'],
                    'icon_name': group_info.get('icon_name'),
                    'types': []
                }
        
        # 添加types到groups
        for type_id, type_info in types.items():
            category_id = type_info.get('categoryID')
            group_id = type_info.get('groupID')
            
            if category_id and group_id:
                if category_id in category_map and group_id in category_map[category_id]['groups']:
                    # 获取模型路径（如果有）
                    model_path = model_map.get(type_id, '')
                    
                    category_map[category_id]['groups'][group_id]['types'].append({
                        'id': type_id,
                        'name': type_info['name'],
                        'name_en': type_info.get('name_en', ''),
                        'name_zh': type_info.get('name_zh', ''),
                        'icon_name': type_info.get('icon_name'),
                        'model_path': model_path
                    })
        
        # 转换为列表并排序（按名称排序）
        result = []
        for category in category_map.values():
            category['groups'] = list(category['groups'].values())
            category['groups'].sort(key=lambda x: x['name'])
            for group in category['groups']:
                group['types'].sort(key=lambda x: x['name'])
            result.append(category)
        
        result.sort(key=lambda x: x['name'])
        return result
    
    def scan_models(self) -> Dict[int, str]:
        """扫描models目录，提取模型文件信息"""
        print("扫描模型文件...")
        
        model_map = {}
        duplicate_ids = []
        
        if not self.models_path.exists():
            print(f"  警告: 模型目录不存在 {self.models_path}")
            return model_map
        
        # 支持的模型文件扩展名
        model_extensions = {'.glb', '.gltf'}
        
        # 扫描所有模型文件
        for model_file in self.models_path.iterdir():
            if not model_file.is_file():
                continue
            
            # 检查文件扩展名
            if model_file.suffix.lower() not in model_extensions:
                continue
            
            # 按下划线分割文件名，取第一位作为id
            filename_without_ext = model_file.stem
            parts = filename_without_ext.split('_')
            model_id_str = parts[0]
            
            try:
                model_id = int(model_id_str)
            except ValueError:
                print(f"  警告: 无法解析模型ID: {model_file.name} (提取的ID: {model_id_str})")
                continue
            
            # 检查是否有重复的id
            if model_id in model_map:
                duplicate_ids.append({
                    'id': model_id,
                    'existing': model_map[model_id],
                    'duplicate': model_file.name
                })
                continue
            
            # 记录模型路径（相对于docs目录）
            model_path = f"./models/{model_file.name}"
            model_map[model_id] = model_path
        
        # 报告重复项
        if duplicate_ids:
            print(f"  发现 {len(duplicate_ids)} 个重复的模型ID:")
            for dup in duplicate_ids:
                print(f"    ID {dup['id']}: 已使用 {dup['existing']}, 跳过 {dup['duplicate']}")
        
        print(f"  扫描到 {len(model_map)} 个模型文件")
        return model_map
    
    def extract_icons(self, icon_names: Set[str]):
        """提取所需的图标文件到static/icons目录"""
        print(f"提取 {len(icon_names)} 个图标文件...")
        
        extracted_count = 0
        for icon_name in icon_names:
            if not icon_name:
                continue
            
            icon_name_normalized = icon_name.replace('\\', '/')
            source_file = self.temp_icons_path / icon_name_normalized
            
            # 尝试只使用文件名查找
            if not source_file.exists():
                icon_filename = Path(icon_name_normalized).name
                source_file_flat = self.temp_icons_path / icon_filename
                if source_file_flat.exists():
                    source_file = source_file_flat
                    icon_name_normalized = icon_filename
            
            dest_file = self.icons_path / icon_name_normalized
            
            if source_file.exists():
                dest_file.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source_file, dest_file)
                extracted_count += 1
        
        print(f"  提取了 {extracted_count} 个图标文件")
    
    def save_index(self, category_tree: list, lang: str):
        """保存索引文件"""
        output_file = self.output_path / f"resources_index_{lang}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(category_tree, f, ensure_ascii=False, indent=2)
        print(f"  {lang.upper()}索引已保存: {output_file}")
    
    def save_available_models(self, model_map: Dict[int, str]):
        """保存有模型的物品ID列表"""
        available_ids = sorted(model_map.keys())
        output_data = {"available": available_ids}
        output_file = self.output_path / "available_models.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        print(f"  可用模型ID列表已保存: {output_file} (共 {len(available_ids)} 个)")
    
    def cleanup(self):
        """清理临时文件"""
        print("清理临时文件...")
        
        if self.temp_icons_path.exists():
            shutil.rmtree(self.temp_icons_path)
        
        print("  清理完成")
    
    def run(self):
        """运行完整的初始化流程"""
        print("开始EVE数据初始化...")
        print("=" * 50)
        
        try:
            # 1. 解压文件
            self.extract_zip_files()
            
            # 2. 连接数据库
            conn_zh = self.connect_database("zh")
            conn_en = self.connect_database("en")
            
            if not conn_zh or not conn_en:
                print("错误: 需要中英文数据库")
                return
            
            try:
                # 3. 扫描模型文件
                model_map = self.scan_models()
                
                # 4. 加载中文数据
                data_zh = self.load_data(conn_zh, 'zh')
                tree_zh = self.build_category_tree(data_zh, model_map)
                
                # 5. 加载英文数据
                data_en = self.load_data(conn_en, 'en')
                tree_en = self.build_category_tree(data_en, model_map)
                
                # 6. 提取图标（合并中英文的图标需求）
                all_icons = data_zh['icon_names'] | data_en['icon_names']
                self.extract_icons(all_icons)
                
                # 7. 保存索引文件
                print("保存索引文件...")
                self.save_index(tree_zh, 'cn')
                self.save_index(tree_en, 'en')
                
                # 8. 保存有模型的物品ID列表
                print("保存可用模型列表...")
                self.save_available_models(model_map)
                
            finally:
                conn_zh.close()
                conn_en.close()
                print("数据库连接已关闭")
            
            # 7. 清理临时文件
            self.cleanup()
            
            print("\n初始化完成！")
            print("=" * 50)
                
        except Exception as e:
            print(f"初始化过程中发生错误: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    initializer = EVEDataInitializer()
    initializer.run()
